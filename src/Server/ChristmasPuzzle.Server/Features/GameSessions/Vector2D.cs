using System.Globalization;

namespace ChristmasPuzzle.Server.Features.GameSessions;

internal readonly record struct Vector2D(double X, double Y)
{
    public static Vector2D Zero { get; } = new(0, 0);

    public static Vector2D operator +(Vector2D left, Vector2D right) => new(left.X + right.X, left.Y + right.Y);
    public static Vector2D operator -(Vector2D left, Vector2D right) => new(left.X - right.X, left.Y - right.Y);
    public static Vector2D operator *(Vector2D value, double scalar) => new(value.X * scalar, value.Y * scalar);

    public double Distance(Vector2D other)
    {
        var dx = X - other.X;
        var dy = Y - other.Y;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    public override string ToString()
    {
        return string.Create(CultureInfo.InvariantCulture, $"({X:0.###},{Y:0.###})");
    }
}
