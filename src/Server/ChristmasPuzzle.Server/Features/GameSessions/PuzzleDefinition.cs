namespace ChristmasPuzzle.Server.Features.GameSessions;

/// <summary>
/// Immutable description of the puzzle layout used to validate client gameplay events.
/// </summary>
public sealed class PuzzleDefinition
{
    public required string PuzzleId { get; init; }

    /// <summary>
    /// Unique version identifier derived from the source asset. Allows the client to detect mismatches.
    /// </summary>
    public required string Version { get; init; }

    /// <summary>
    /// Canvas width used by the Phaser scene (matches frontend configuration).
    /// </summary>
    public required double CanvasWidth { get; init; }

    /// <summary>
    /// Canvas height used by the Phaser scene (matches frontend configuration).
    /// </summary>
    public required double CanvasHeight { get; init; }

    /// <summary>
    /// Definitions per puzzle piece keyed by piece identifier (e.g. "piece_1").
    /// </summary>
    public required IReadOnlyDictionary<string, PuzzlePieceDefinition> Pieces { get; init; }
}

public sealed class PuzzlePieceDefinition
{
    public required string Id { get; init; }

    /// <summary>
    /// Target anchor X coordinate in canvas pixels.
    /// </summary>
    public required double TargetX { get; init; }

    /// <summary>
    /// Target anchor Y coordinate in canvas pixels.
    /// </summary>
    public required double TargetY { get; init; }

    /// <summary>
    /// Snap tolerance in canvas pixels derived from the piece footprint.
    /// </summary>
    public required double SnapTolerance { get; init; }

    /// <summary>
    /// Width of the piece footprint in canvas pixels (useful for debugging).
    /// </summary>
    public required double Width { get; init; }

    /// <summary>
    /// Height of the piece footprint in canvas pixels (useful for debugging).
    /// </summary>
    public required double Height { get; init; }
}
