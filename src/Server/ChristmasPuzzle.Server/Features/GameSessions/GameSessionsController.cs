using Microsoft.AspNetCore.Mvc;
using ChristmasPuzzle.Server.Features.Users;

namespace ChristmasPuzzle.Server.Features.GameSessions;

[ApiController]
[Route("api/users/{uid:guid}/sessions")]
public sealed class GameSessionsController : ControllerBase
{
    private readonly IGameSessionService _gameSessionService;
    private readonly IUserDataService _userDataService;
    private readonly ILogger<GameSessionsController> _logger;

    public GameSessionsController(IGameSessionService gameSessionService, IUserDataService userDataService, ILogger<GameSessionsController> logger)
    {
        _gameSessionService = gameSessionService;
        _userDataService = userDataService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<StartGameSessionResponse>> StartSession(Guid uid, CancellationToken cancellationToken)
    {
        if (uid == Guid.Empty)
        {
            return BadRequest(new { error = "UID must be a valid GUID." });
        }

        var result = await _gameSessionService.StartSessionAsync(uid, cancellationToken);
        
        // Always succeeds now - no more session conflicts
        return Ok(new StartGameSessionResponse
        {
            Success = true,
            SessionId = result.SessionId!.Value,
            PuzzleVersion = result.PuzzleVersion!,
            StartedAtUtc = result.StartTimeUtc!.Value,
            TotalPieces = result.TotalPieces!.Value
        });
    }

    [HttpPost("{sessionId:guid}/snaps")]
    public async Task<ActionResult<RecordPieceSnapResponse>> RecordPieceSnap(Guid uid, Guid sessionId, [FromBody] RecordPieceSnapRequest request, CancellationToken cancellationToken)
    {
        if (uid == Guid.Empty || sessionId == Guid.Empty)
        {
            return BadRequest(new { error = "UID and sessionId must be valid GUIDs." });
        }

        if (string.IsNullOrWhiteSpace(request.PieceId))
        {
            return BadRequest(new { error = "PieceId is required." });
        }

        var result = await _gameSessionService.RecordPieceSnapAsync(uid, sessionId, request, cancellationToken);

        return result.Status switch
        {
            RecordPieceSnapStatus.Accepted or RecordPieceSnapStatus.Duplicate => Ok(new RecordPieceSnapResponse
            {
                Status = result.Status.ToString(),
                Distance = result.Distance,
                AllowedDistance = result.AllowedDistance,
                TotalPieces = result.TotalPieces,
                PlacedPieces = result.PlacedPieces
            }),
            RecordPieceSnapStatus.UnknownPiece => BadRequest(new { error = "Unknown puzzle piece identifier." }),
            RecordPieceSnapStatus.TooFar => UnprocessableEntity(new RecordPieceSnapResponse
            {
                Status = result.Status.ToString(),
                Distance = result.Distance,
                AllowedDistance = result.AllowedDistance,
                Message = "Reported piece position is outside the allowed tolerance."
            }),
            RecordPieceSnapStatus.SessionCompleted => Conflict(new RecordPieceSnapResponse
            {
                Status = result.Status.ToString(),
                TotalPieces = result.TotalPieces,
                PlacedPieces = result.PlacedPieces,
                Message = "Session already completed."
            }),
            RecordPieceSnapStatus.SessionNotFound => NotFound(new { error = "Session not found for user." }),
            _ => StatusCode(500, new { error = "Unexpected session state." })
        };
    }

    [HttpPost("{sessionId:guid}/complete")]
    public async Task<ActionResult<CompleteGameSessionResponse>> CompleteSession(Guid uid, Guid sessionId, CancellationToken cancellationToken)
    {
        if (uid == Guid.Empty || sessionId == Guid.Empty)
        {
            return BadRequest(new { error = "UID and sessionId must be valid GUIDs." });
        }

        var result = await _gameSessionService.CompleteSessionAsync(uid, sessionId, cancellationToken);

        switch (result.Status)
        {
            case CompleteGameSessionStatus.Completed:
                if (result.Outcome is null)
                {
                    _logger.LogInformation("Session {SessionId} completed without outcome metadata.", result.SessionId);
                    return StatusCode(500, new { error = "Session outcome unavailable." });
                }

                var updatedUser = await _userDataService.ApplyGameSessionResultAsync(uid, result.Outcome);

                return Ok(new CompleteGameSessionResponse
                {
                    SessionId = result.SessionId!.Value,
                    StartedAtUtc = result.StartedAtUtc!.Value,
                    CompletedAtUtc = result.CompletedAtUtc!.Value,
                    DurationSeconds = result.Outcome.DurationSeconds,
                    TotalPieces = result.Outcome.PiecesPlaced,
                    PlacedPieces = result.Outcome.PiecesPlaced,
                    UserData = updatedUser
                });

            case CompleteGameSessionStatus.IncompletePieces:
                return Conflict(new CompleteGameSessionResponse
                {
                    Message = "Not all pieces have been validated for this session.",
                    PlacedPieces = result.PlacedPieces,
                    TotalPieces = result.TotalPieces
                });

            case CompleteGameSessionStatus.AlreadyCompleted:
                return Ok(new CompleteGameSessionResponse
                {
                    SessionId = result.SessionId!.Value,
                    StartedAtUtc = result.StartedAtUtc!.Value,
                    CompletedAtUtc = result.CompletedAtUtc!.Value,
                    DurationSeconds = result.DurationSeconds,
                    TotalPieces = result.TotalPieces ?? 0,
                    PlacedPieces = result.PlacedPieces
                });

            case CompleteGameSessionStatus.SessionNotFound:
                return NotFound(new { error = "Session not found for user." });

            default:
                return StatusCode(500, new { error = "Unexpected session state." });
        }
    }
}

public sealed record StartGameSessionResponse
{
    public bool Success { get; init; }
    public Guid? SessionId { get; init; }
    public string? PuzzleVersion { get; init; }
    public DateTime? StartedAtUtc { get; init; }
    public int? TotalPieces { get; init; }
    public Guid? ActiveSessionId { get; init; }
    public string? Message { get; init; }
}

public sealed record RecordPieceSnapResponse
{
    public string Status { get; init; } = string.Empty;
    public double Distance { get; init; }
    public double AllowedDistance { get; init; }
    public int TotalPieces { get; init; }
    public int PlacedPieces { get; init; }
    public string? Message { get; init; }
}

public sealed record CompleteGameSessionResponse
{
    public Guid? SessionId { get; init; }
    public DateTime? StartedAtUtc { get; init; }
    public DateTime? CompletedAtUtc { get; init; }
    public double? DurationSeconds { get; init; }
    public int? TotalPieces { get; init; }
    public int? PlacedPieces { get; init; }
    public string? Message { get; init; }
    public UserData? UserData { get; init; }
}

public sealed record StartGameSessionRequest
{
    public bool ForceRestart { get; init; }
}
