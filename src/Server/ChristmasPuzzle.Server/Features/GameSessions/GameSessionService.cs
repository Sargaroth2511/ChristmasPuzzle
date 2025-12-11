using System.Collections.Concurrent;

namespace ChristmasPuzzle.Server.Features.GameSessions;

public interface IGameSessionService
{
    Task<StartGameSessionResult> StartSessionAsync(Guid userId, bool forceRestart = false, CancellationToken cancellationToken = default);
    Task<RecordPieceSnapResult> RecordPieceSnapAsync(Guid userId, Guid sessionId, RecordPieceSnapRequest request, CancellationToken cancellationToken = default);
    Task<CompleteGameSessionResult> CompleteSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<GameSession?> GetSessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
}

public sealed class GameSessionService : IGameSessionService
{
    private const double DistanceSlackMultiplier = 1.15;
    private const double DistanceSlackPixels = 4;
    private const double GuidelineToleranceMultiplier = 2.6; // Same as SNAP_DEBUG_MULTIPLIER in client
    private static readonly TimeSpan SessionInactivityTimeout = TimeSpan.FromMinutes(45);
    private static readonly TimeSpan CompletedRetention = TimeSpan.FromMinutes(10);

    private readonly IPuzzleDefinitionProvider _puzzleDefinitionProvider;
    private readonly ILogger<GameSessionService> _logger;

    private readonly ConcurrentDictionary<Guid, GameSession> _sessions = new();
    private readonly ConcurrentDictionary<Guid, Guid> _userSessions = new();

    public GameSessionService(IPuzzleDefinitionProvider puzzleDefinitionProvider, ILogger<GameSessionService> logger)
    {
        _puzzleDefinitionProvider = puzzleDefinitionProvider;
        _logger = logger;
    }

    public Task<StartGameSessionResult> StartSessionAsync(Guid userId, bool forceRestart = false, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        CleanupExpiredSessions();

        if (_userSessions.TryGetValue(userId, out var existingSessionId))
        {
            if (_sessions.TryGetValue(existingSessionId, out var existingSession))
            {
                // Session exists in _sessions
                if (!existingSession.Completed)
                {
                    // Active session - check if it's stale or force restart requested
                    var inactive = DateTime.UtcNow - existingSession.LastUpdatedUtc >= SessionInactivityTimeout;
                    if (!forceRestart && !inactive)
                    {
                        _logger.LogInformation("User {UserId} attempted to start a new session but already has active session {SessionId}.", userId, existingSession.SessionId);
                        return Task.FromResult(StartGameSessionResult.ActiveSession(existingSession.SessionId));
                    }

                    if (forceRestart)
                    {
                        _logger.LogInformation("Force restarting session {SessionId} for user {UserId}.", existingSession.SessionId, userId);
                    }
                    else
                    {
                        _logger.LogWarning("Expiring stale session {SessionId} for user {UserId}.", existingSession.SessionId, userId);
                    }

                    _sessions.TryRemove(existingSession.SessionId, out _);
                    _userSessions.TryRemove(userId, out _);
                }
                else
                {
                    // Session is completed, clean up the user mapping
                    _logger.LogDebug("Removing completed session mapping for user {UserId}, session {SessionId}.", userId, existingSessionId);
                    _userSessions.TryRemove(userId, out _);
                }
            }
            else
            {
                // Orphaned entry: session ID exists in _userSessions but not in _sessions
                _logger.LogWarning("Found orphaned session mapping for user {UserId}, session {SessionId}. Cleaning up.", userId, existingSessionId);
                _userSessions.TryRemove(userId, out _);
            }
        }

        var puzzleDefinition = _puzzleDefinitionProvider.GetDefinition();
        var session = new GameSession
        {
            SessionId = Guid.NewGuid(),
            UserId = userId,
            StartTimeUtc = DateTime.UtcNow,
            LastUpdatedUtc = DateTime.UtcNow,
            PuzzleDefinition = puzzleDefinition,
            PuzzleVersion = puzzleDefinition.Version
        };

        _sessions[session.SessionId] = session;
        _userSessions[userId] = session.SessionId;

        return Task.FromResult(StartGameSessionResult.CreateSuccessful(session.SessionId, puzzleDefinition.Version, session.StartTimeUtc, puzzleDefinition.Pieces.Count));
    }

    public Task<RecordPieceSnapResult> RecordPieceSnapAsync(Guid userId, Guid sessionId, RecordPieceSnapRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_sessions.TryGetValue(sessionId, out var session) || session.UserId != userId)
        {
            return Task.FromResult(RecordPieceSnapResult.NotFound);
        }

        if (session.Completed)
        {
            return Task.FromResult(RecordPieceSnapResult.SessionCompleted(session.TotalPieces, session.PlacedCount));
        }

        var puzzle = session.PuzzleDefinition;
        if (!puzzle.Pieces.TryGetValue(request.PieceId, out var piece))
        {
            _logger.LogWarning("User {UserId} reported unknown piece '{PieceId}' for session {SessionId}.", userId, request.PieceId, sessionId);
            return Task.FromResult(RecordPieceSnapResult.UnknownPiece);
        }

        var now = DateTime.UtcNow;
        var reportedAnchor = new Vector2D(request.AnchorX, request.AnchorY);
        var target = new Vector2D(piece.TargetX, piece.TargetY);
        var distance = reportedAnchor.Distance(target);
        
        // Use client-reported tolerance if available (includes guideline multiplier), otherwise use base tolerance
        var baseTolerance = request.ClientTolerance ?? piece.SnapTolerance;
        var allowed = baseTolerance * DistanceSlackMultiplier + DistanceSlackPixels;

        if (distance > allowed)
        {
            _logger.LogInformation(
                "Rejecting snap for user {UserId}, session {SessionId}, piece {PieceId}. Distance {Distance:0.##} exceeded allowed {Allowed:0.##}. (ClientTolerance: {ClientTolerance:0.##}, BaseTolerance: {BaseTolerance:0.##})",
                userId, sessionId, request.PieceId, distance, allowed, request.ClientTolerance, piece.SnapTolerance);
            return Task.FromResult(RecordPieceSnapResult.TooFar(distance, allowed));
        }

        if (session.ContainsPiece(request.PieceId))
        {
            session.LastUpdatedUtc = now;
            return Task.FromResult(RecordPieceSnapResult.Duplicate(distance, allowed, session.TotalPieces, session.PlacedCount));
        }

        var placement = new PiecePlacement(request.PieceId, request.AnchorX, request.AnchorY, distance, allowed, now);
        session.AddPlacement(placement);
        session.LastUpdatedUtc = now;

        var placedCount = session.PlacedCount;
        if (placedCount == session.TotalPieces)
        {
            // Mark session as completed when last piece is validated
            session.Completed = true;
            session.CompletedAtUtc = now;
            var duration = now - session.StartTimeUtc;
            _logger.LogInformation("Session {SessionId} for user {UserId} completed. Duration: {Duration:0.##}s", sessionId, userId, duration.TotalSeconds);
        }

        return Task.FromResult(RecordPieceSnapResult.Accepted(distance, allowed, session.TotalPieces, placedCount));
    }

    public Task<CompleteGameSessionResult> CompleteSessionAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!_sessions.TryGetValue(sessionId, out var session) || session.UserId != userId)
        {
            return Task.FromResult(CompleteGameSessionResult.NotFound);
        }

        if (!session.Completed || session.CompletedAtUtc == null)
        {
            // Session not yet completed (all pieces not validated)
            _logger.LogWarning(
                "Completion rejected for session {SessionId} (user {UserId}): placed {PlacedCount} / {TotalPieces}.",
                sessionId, userId, session.PlacedCount, session.TotalPieces);
            return Task.FromResult(CompleteGameSessionResult.IncompletePieces(session.PlacedCount, session.TotalPieces));
        }

        // Session already completed when last piece was validated
        // Remove user mapping and return the completion data
        _userSessions.TryRemove(userId, out _);
        
        var duration = session.CompletedAtUtc.Value - session.StartTimeUtc;
        var durationSeconds = Math.Max(duration.TotalSeconds, 0);

        return Task.FromResult(CompleteGameSessionResult.Success(session.SessionId, session.StartTimeUtc, session.CompletedAtUtc.Value, durationSeconds, session.TotalPieces));
    }

    public Task<GameSession?> GetSessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _sessions.TryGetValue(sessionId, out var session);
        return Task.FromResult(session);
    }

    private void CleanupExpiredSessions()
    {
        var now = DateTime.UtcNow;
        foreach (var (sessionId, session) in _sessions.ToArray())
        {
            if (!session.Completed && now - session.LastUpdatedUtc > SessionInactivityTimeout)
            {
                if (_sessions.TryRemove(sessionId, out _))
                {
                    _logger.LogWarning("Removed inactive session {SessionId} for user {UserId}.", sessionId, session.UserId);
                    _userSessions.TryRemove(session.UserId, out _);
                }
            }

            if (session.Completed && session.CompletedAtUtc is { } completedAt && now - completedAt > CompletedRetention)
            {
                if (_sessions.TryRemove(sessionId, out _))
                {
                    _logger.LogDebug("Evicted completed session {SessionId} for user {UserId}.", sessionId, session.UserId);
                }
            }
        }
    }
}

public sealed record StartGameSessionResult
{
    private StartGameSessionResult(bool success, Guid? sessionId = null, string? puzzleVersion = null, DateTime? startTimeUtc = null, int? totalPieces = null, Guid? activeSessionId = null)
    {
        Success = success;
        SessionId = sessionId;
        PuzzleVersion = puzzleVersion;
        StartTimeUtc = startTimeUtc;
        TotalPieces = totalPieces;
        ActiveSessionId = activeSessionId;
    }

    public bool Success { get; }
    public Guid? SessionId { get; }
    public string? PuzzleVersion { get; }
    public DateTime? StartTimeUtc { get; }
    public int? TotalPieces { get; }
    public Guid? ActiveSessionId { get; }

    public static StartGameSessionResult ActiveSession(Guid activeSessionId) =>
        new(false, activeSessionId: activeSessionId);

    public static StartGameSessionResult CreateSuccessful(Guid sessionId, string puzzleVersion, DateTime startTimeUtc, int totalPieces) =>
        new(true, sessionId, puzzleVersion, startTimeUtc, totalPieces);
}

public sealed record RecordPieceSnapRequest
{
    public string PieceId { get; init; } = string.Empty;
    public double AnchorX { get; init; }
    public double AnchorY { get; init; }
    public double? ClientDistance { get; init; }
    public double? ClientTolerance { get; init; }
    public bool GuidelinesEnabled { get; init; } = false; // Whether debug guidelines are active
}

public enum RecordPieceSnapStatus
{
    Accepted,
    Duplicate,
    TooFar,
    UnknownPiece,
    SessionNotFound,
    SessionCompleted
}

public sealed record RecordPieceSnapResult
{
    private RecordPieceSnapResult(RecordPieceSnapStatus status, double distance = 0, double allowed = 0, int totalPieces = 0, int placedPieces = 0)
    {
        Status = status;
        Distance = distance;
        AllowedDistance = allowed;
        TotalPieces = totalPieces;
        PlacedPieces = placedPieces;
    }

    public RecordPieceSnapStatus Status { get; }
    public double Distance { get; }
    public double AllowedDistance { get; }
    public int TotalPieces { get; }
    public int PlacedPieces { get; }
    public bool IsDuplicate => Status == RecordPieceSnapStatus.Duplicate;
    public bool IsAccepted => Status == RecordPieceSnapStatus.Accepted || Status == RecordPieceSnapStatus.Duplicate;

    public static RecordPieceSnapResult Accepted(double distance, double allowed, int totalPieces, int placedPieces) =>
        new(RecordPieceSnapStatus.Accepted, distance, allowed, totalPieces, placedPieces);

    public static RecordPieceSnapResult Duplicate(double distance, double allowed, int totalPieces, int placedPieces) =>
        new(RecordPieceSnapStatus.Duplicate, distance, allowed, totalPieces, placedPieces);

    public static RecordPieceSnapResult TooFar(double distance, double allowed) =>
        new(RecordPieceSnapStatus.TooFar, distance, allowed);

    public static RecordPieceSnapResult UnknownPiece { get; } = new(RecordPieceSnapStatus.UnknownPiece);

    public static RecordPieceSnapResult NotFound { get; } = new(RecordPieceSnapStatus.SessionNotFound);

    public static RecordPieceSnapResult SessionCompleted(int totalPieces, int placedPieces) =>
        new(RecordPieceSnapStatus.SessionCompleted, totalPieces: totalPieces, placedPieces: placedPieces);
}

public enum CompleteGameSessionStatus
{
    Completed,
    SessionNotFound,
    AlreadyCompleted,
    IncompletePieces
}

public sealed record CompleteGameSessionResult
{
    private CompleteGameSessionResult(
        CompleteGameSessionStatus status,
        Guid? sessionId = null,
        DateTime? startedAtUtc = null,
        DateTime? completedAtUtc = null,
        double? durationSeconds = null,
        int? totalPieces = null,
        int? placedPieces = null,
        GameSessionOutcome? outcome = null)
    {
        Status = status;
        SessionId = sessionId;
        StartedAtUtc = startedAtUtc;
        CompletedAtUtc = completedAtUtc;
        DurationSeconds = durationSeconds;
        TotalPieces = totalPieces;
        PlacedPieces = placedPieces;
        Outcome = outcome;
    }

    public CompleteGameSessionStatus Status { get; }
    public Guid? SessionId { get; }
    public DateTime? StartedAtUtc { get; }
    public DateTime? CompletedAtUtc { get; }
    public double? DurationSeconds { get; }
    public int? TotalPieces { get; }
    public int? PlacedPieces { get; }
    public GameSessionOutcome? Outcome { get; }

    public bool IsSuccess => Status == CompleteGameSessionStatus.Completed;

    public static CompleteGameSessionResult Success(Guid sessionId, DateTime startedAtUtc, DateTime completedAtUtc, double durationSeconds, int totalPieces) =>
        new(CompleteGameSessionStatus.Completed, sessionId, startedAtUtc, completedAtUtc, durationSeconds, totalPieces, totalPieces, new GameSessionOutcome(totalPieces, durationSeconds));

    public static CompleteGameSessionResult NotFound { get; } = new(CompleteGameSessionStatus.SessionNotFound);

    public static CompleteGameSessionResult AlreadyCompleted(Guid sessionId, DateTime startedAtUtc, DateTime completedAtUtc, int placedPieces, int totalPieces) =>
        new(CompleteGameSessionStatus.AlreadyCompleted, sessionId, startedAtUtc, completedAtUtc, placedPieces: placedPieces, totalPieces: totalPieces);

    public static CompleteGameSessionResult IncompletePieces(int placedPieces, int totalPieces) =>
        new(CompleteGameSessionStatus.IncompletePieces, placedPieces: placedPieces, totalPieces: totalPieces);
}

public sealed record GameSessionOutcome(int PiecesPlaced, double DurationSeconds);
