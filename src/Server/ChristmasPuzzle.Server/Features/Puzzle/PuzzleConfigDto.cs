namespace ChristmasPuzzle.Server.Features.Puzzle;

public sealed record PuzzleConfigDto(IReadOnlyList<PuzzlePointDto> Outline, IReadOnlyList<PuzzlePieceDto> Pieces);

public sealed record PuzzlePieceDto(string Id, IReadOnlyList<PuzzlePointDto> Points, PuzzlePointDto Anchor);

public sealed record PuzzlePointDto(double X, double Y);
