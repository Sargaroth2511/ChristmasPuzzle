using System.Linq;

namespace ChristmasPuzzle.Server.Features.Puzzle;

internal static class StarPuzzleFactory
{
    private const double CenterX = 0.5;
    private const double CenterY = 0.5;
    private const double OuterRadius = 0.45;
    private const double InnerRadius = OuterRadius * 0.48;

    public static PuzzleConfigDto Create()
    {
        var outline = GenerateStarPoints();
        var pieces = GeneratePieces(outline);
        return new PuzzleConfigDto(outline, pieces);
    }

    private static IReadOnlyList<PuzzlePointDto> GenerateStarPoints()
    {
        var points = new List<PuzzlePointDto>(10);
        var startAngle = -Math.PI / 2; // pointing upwards

        for (var i = 0; i < 10; i++)
        {
            var angle = startAngle + i * Math.PI / 5;
            var radius = i % 2 == 0 ? OuterRadius : InnerRadius;
            var x = CenterX + radius * Math.Cos(angle);
            var y = CenterY + radius * Math.Sin(angle);
            points.Add(new PuzzlePointDto(Round(x), Round(y)));
        }

        return points;
    }

    private static IReadOnlyList<PuzzlePieceDto> GeneratePieces(IReadOnlyList<PuzzlePointDto> outline)
    {
        var pieces = new List<PuzzlePieceDto>(10);

        for (var i = 0; i < 5; i++)
        {
            var outerIndex = (i * 2) % outline.Count;
            var innerIndex = (outerIndex + 1) % outline.Count;
            var nextOuterIndex = (outerIndex + 2) % outline.Count;
            var nextInnerIndex = (innerIndex + 2) % outline.Count;

            var spike = new List<PuzzlePointDto>
            {
                outline[outerIndex],
                outline[innerIndex],
                outline[nextOuterIndex]
            };

            pieces.Add(CreatePiece($"outer-{i}", spike));

            var core = new List<PuzzlePointDto>
            {
                new PuzzlePointDto(CenterX, CenterY),
                outline[innerIndex],
                outline[nextInnerIndex]
            };

            pieces.Add(CreatePiece($"inner-{i}", core));
        }

        return pieces;
    }

    private static PuzzlePieceDto CreatePiece(string id, IReadOnlyList<PuzzlePointDto> points)
    {
        var anchor = ComputeCentroid(points);
        return new PuzzlePieceDto(id, points, anchor);
    }

    private static PuzzlePointDto ComputeCentroid(IReadOnlyList<PuzzlePointDto> points)
    {
        // Standard polygon centroid algorithm
        var area = 0.0;
        var cx = 0.0;
        var cy = 0.0;

        for (var i = 0; i < points.Count; i++)
        {
            var current = points[i];
            var next = points[(i + 1) % points.Count];
            var cross = current.X * next.Y - next.X * current.Y;
            area += cross;
            cx += (current.X + next.X) * cross;
            cy += (current.Y + next.Y) * cross;
        }

        if (Math.Abs(area) < 1e-6)
        {
            var avgX = points.Average(p => p.X);
            var avgY = points.Average(p => p.Y);
            return new PuzzlePointDto(avgX, avgY);
        }

        area *= 0.5;
        var factor = 1.0 / (6.0 * area);
        return new PuzzlePointDto(cx * factor, cy * factor);
    }

    private static double Round(double value)
    {
        return Math.Round(value, 6, MidpointRounding.AwayFromZero);
    }
}
