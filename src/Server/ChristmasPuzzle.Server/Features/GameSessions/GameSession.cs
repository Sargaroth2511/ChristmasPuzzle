using System.Collections.Concurrent;

namespace ChristmasPuzzle.Server.Features.GameSessions;

public sealed class GameSession
{
    public required Guid SessionId { get; init; }
    public required Guid UserId { get; init; }
    public required DateTime StartTimeUtc { get; init; }
    public required PuzzleDefinition PuzzleDefinition { get; init; }
    public required string PuzzleVersion { get; init; }

    public DateTime LastUpdatedUtc { get; set; }
    public bool Completed { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    private readonly ConcurrentDictionary<string, PiecePlacement> _placements = new(StringComparer.OrdinalIgnoreCase);

    public IReadOnlyDictionary<string, PiecePlacement> Placements => _placements;

    public int PlacedCount => _placements.Count;
    public int TotalPieces => PuzzleDefinition.Pieces.Count;

    public PiecePlacement AddPlacement(PiecePlacement placement)
    {
        _placements[placement.PieceId] = placement;
        return placement;
    }

    public bool ContainsPiece(string pieceId) => _placements.ContainsKey(pieceId);

    public bool TryGetPlacement(string pieceId, out PiecePlacement placement) =>
        _placements.TryGetValue(pieceId, out placement!);
}

public readonly record struct PiecePlacement(
    string PieceId,
    double AnchorX,
    double AnchorY,
    double Distance,
    double AllowedDistance,
    DateTime RecordedAtUtc);
