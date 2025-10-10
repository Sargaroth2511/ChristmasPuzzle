using System.Linq;

namespace ChristmasPuzzle.Server.Features.GameSessions;

internal static class GeometryUtilities
{
    public static Vector2D ComputeCentroid(IReadOnlyList<Vector2D> points)
    {
        if (points.Count == 0)
        {
            return Vector2D.Zero;
        }

        double area = 0;
        double cx = 0;
        double cy = 0;

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
            var sumX = 0d;
            var sumY = 0d;
            foreach (var point in points)
            {
                sumX += point.X;
                sumY += point.Y;
            }

            return new Vector2D(sumX / points.Count, sumY / points.Count);
        }

        area *= 0.5;
        var factor = 1 / (6 * area);
        return new Vector2D(cx * factor, cy * factor);
    }

    public static Bounds ComputeBounds(IEnumerable<Vector2D> outlinePoints, IEnumerable<Vector2D> piecePoints)
    {
        return ComputeBounds(outlinePoints.Concat(piecePoints));
    }

    public static Bounds ComputeBounds(IEnumerable<Vector2D> points)
    {
        using var enumerator = points.GetEnumerator();
        if (!enumerator.MoveNext())
        {
            return new Bounds(0, 0, 1, 1);
        }

        var first = enumerator.Current;
        double minX = first.X, maxX = first.X, minY = first.Y, maxY = first.Y;

        while (enumerator.MoveNext())
        {
            var pt = enumerator.Current;
            if (pt.X < minX) minX = pt.X;
            if (pt.X > maxX) maxX = pt.X;
            if (pt.Y < minY) minY = pt.Y;
            if (pt.Y > maxY) maxY = pt.Y;
        }

        return new Bounds(minX, minY, maxX, maxY);
    }

    public static (double Scale, double SpanX, double SpanY) CalculateUniformScale(Bounds bounds, double canvasWidth, double canvasHeight, double puzzleScaleRatio)
    {
        var spanX = Math.Max(bounds.Width, 1e-6);
        var spanY = Math.Max(bounds.Height, 1e-6);
        var baseScale = Math.Min(canvasWidth / spanX, canvasHeight / spanY);
        var uniformScale = baseScale * puzzleScaleRatio;
        return (uniformScale, spanX, spanY);
    }

    public static (double OffsetX, double OffsetY) CalculateOffsets(Bounds bounds, (double Scale, double SpanX, double SpanY) scaleInfo, double canvasWidth, double canvasHeight)
    {
        var (uniformScale, spanX, spanY) = scaleInfo;
        var offsetX = (canvasWidth - spanX * uniformScale) * 0.5;
        var offsetY = (canvasHeight - spanY * uniformScale) * 0.5;
        return (offsetX, offsetY);
    }

    public static Vector2D ToCanvasPoint(Vector2D point, Bounds bounds, (double Scale, double SpanX, double SpanY) scaleInfo, (double OffsetX, double OffsetY) offsets)
    {
        var (uniformScale, _, _) = scaleInfo;
        var (offsetX, offsetY) = offsets;
        var x = offsetX + (point.X - bounds.MinX) * uniformScale;
        var y = offsetY + (point.Y - bounds.MinY) * uniformScale;
        return new Vector2D(x, y);
    }

    public static Bounds ComputeBounds(IReadOnlyList<Vector2D> points)
    {
        if (points.Count == 0)
        {
            return new Bounds(0, 0, 0, 0);
        }

        double minX = points[0].X, maxX = points[0].X;
        double minY = points[0].Y, maxY = points[0].Y;

        for (var i = 1; i < points.Count; i++)
        {
            var pt = points[i];
            if (pt.X < minX) minX = pt.X;
            if (pt.X > maxX) maxX = pt.X;
            if (pt.Y < minY) minY = pt.Y;
            if (pt.Y > maxY) maxY = pt.Y;
        }

        return new Bounds(minX, minY, maxX, maxY);
    }

    public readonly struct Bounds(double minX, double minY, double maxX, double maxY)
    {
        public double MinX { get; } = minX;
        public double MinY { get; } = minY;
        public double MaxX { get; } = maxX;
        public double MaxY { get; } = maxY;
        public double Width => Math.Max(MaxX - MinX, 0);
        public double Height => Math.Max(MaxY - MinY, 0);
    }
}
