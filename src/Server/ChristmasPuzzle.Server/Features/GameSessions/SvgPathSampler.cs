using System.Globalization;

namespace ChristmasPuzzle.Server.Features.GameSessions;

internal static class SvgPathSampler
{
    private const int CubicBezierSegments = 24;
    private const double DuplicateEpsilon = 1e-4;

    public static List<Vector2D> SamplePath(string pathData)
    {
        var points = new List<Vector2D>();
        if (string.IsNullOrWhiteSpace(pathData))
        {
            return points;
        }

        var data = pathData.AsSpan();
        var index = 0;
        var length = data.Length;
        char currentCommand = '\0';
        var currentPoint = Vector2D.Zero;
        var startPoint = Vector2D.Zero;

        while (index < length)
        {
            var ch = data[index];
            if (char.IsWhiteSpace(ch) || ch == ',')
            {
                index++;
                continue;
            }

            if (char.IsLetter(ch))
            {
                currentCommand = ch;
                index++;
                continue;
            }

            if (currentCommand == '\0')
            {
                throw new FormatException("SVG path data does not start with a command.");
            }

            switch (currentCommand)
            {
                case 'M':
                {
                    if (!TryReadPoint(data, length, ref index, out var absolutePoint))
                    {
                        continue;
                    }

                    currentPoint = absolutePoint;
                    startPoint = absolutePoint;
                    AppendPoint(points, currentPoint);

                    currentCommand = 'L';
                    break;
                }
                case 'm':
                {
                    if (!TryReadPoint(data, length, ref index, out var delta))
                    {
                        continue;
                    }

                    currentPoint += delta;
                    startPoint = currentPoint;
                    AppendPoint(points, currentPoint);

                    currentCommand = 'l';
                    break;
                }
                case 'L':
                {
                    if (!TryReadPoint(data, length, ref index, out var target))
                    {
                        continue;
                    }

                    AddLine(points, currentPoint, target);
                    currentPoint = target;
                    break;
                }
                case 'l':
                {
                    if (!TryReadPoint(data, length, ref index, out var delta))
                    {
                        continue;
                    }

                    var target = currentPoint + delta;
                    AddLine(points, currentPoint, target);
                    currentPoint = target;
                    break;
                }
                case 'V':
                {
                    if (!TryReadNumber(data, length, ref index, out var y))
                    {
                        continue;
                    }

                    var target = new Vector2D(currentPoint.X, y);
                    AddLine(points, currentPoint, target);
                    currentPoint = target;
                    break;
                }
                case 'v':
                {
                    if (!TryReadNumber(data, length, ref index, out var dy))
                    {
                        continue;
                    }

                    var target = new Vector2D(currentPoint.X, currentPoint.Y + dy);
                    AddLine(points, currentPoint, target);
                    currentPoint = target;
                    break;
                }
                case 'C':
                {
                    if (!TryReadCubic(data, length, ref index, currentPoint, relative: false, out var segment))
                    {
                        continue;
                    }

                    AddCubic(points, currentPoint, segment.Control1, segment.Control2, segment.End);
                    currentPoint = segment.End;
                    break;
                }
                case 'c':
                {
                    if (!TryReadCubic(data, length, ref index, currentPoint, relative: true, out var segment))
                    {
                        continue;
                    }

                    AddCubic(points, currentPoint, segment.Control1, segment.Control2, segment.End);
                    currentPoint = segment.End;
                    break;
                }
                case 'Z':
                case 'z':
                {
                    AddLine(points, currentPoint, startPoint);
                    currentPoint = startPoint;
                    index++;
                    break;
                }
                default:
                    throw new NotSupportedException($"Unsupported SVG path command '{currentCommand}'.");
            }
        }

        return points;
    }

    private static bool TryReadPoint(ReadOnlySpan<char> data, int length, ref int index, out Vector2D point)
    {
        var originalIndex = index;
        if (!TryReadNumber(data, length, ref index, out var x) ||
            !TryReadNumber(data, length, ref index, out var y))
        {
            index = originalIndex;
            point = Vector2D.Zero;
            return false;
        }

        point = new Vector2D(x, y);
        return true;
    }

    private static bool TryReadNumber(ReadOnlySpan<char> data, int length, ref int index, out double value)
    {
        while (index < length && (char.IsWhiteSpace(data[index]) || data[index] == ',')) index++;
        if (index >= length)
        {
            value = 0;
            return false;
        }

        var start = index;
        var hasDigits = false;

        if (data[index] == '+' || data[index] == '-')
        {
            index++;
        }

        while (index < length && char.IsDigit(data[index]))
        {
            hasDigits = true;
            index++;
        }

        if (index < length && data[index] == '.')
        {
            index++;
            while (index < length && char.IsDigit(data[index]))
            {
                hasDigits = true;
                index++;
            }
        }

        if (!hasDigits && (index >= length || (data[index] != 'e' && data[index] != 'E')))
        {
            index = start;
            value = 0;
            return false;
        }

        if (index < length && (data[index] == 'e' || data[index] == 'E'))
        {
            index++;
            if (index < length && (data[index] == '+' || data[index] == '-'))
            {
                index++;
            }

            var expDigits = false;
            while (index < length && char.IsDigit(data[index]))
            {
                expDigits = true;
                index++;
            }

            if (!expDigits)
            {
                index = start;
                value = 0;
                return false;
            }
        }

        var slice = data[start..index];
        if (!double.TryParse(slice, NumberStyles.Float, CultureInfo.InvariantCulture, out value))
        {
            index = start;
            return false;
        }

        return true;
    }

    private static bool TryReadCubic(ReadOnlySpan<char> data, int length, ref int index, Vector2D currentPoint, bool relative, out CubicSegment segment)
    {
        var originalIndex = index;

        if (!TryReadPoint(data, length, ref index, out var control1) ||
            !TryReadPoint(data, length, ref index, out var control2) ||
            !TryReadPoint(data, length, ref index, out var end))
        {
            index = originalIndex;
            segment = default;
            return false;
        }

        if (relative)
        {
            control1 += currentPoint;
            control2 += currentPoint;
            end += currentPoint;
        }

        segment = new CubicSegment(control1, control2, end);
        return true;
    }

    private static void AddLine(List<Vector2D> points, Vector2D from, Vector2D to)
    {
        AppendPoint(points, from);
        AppendPoint(points, to);
    }

    private static void AddCubic(List<Vector2D> points, Vector2D from, Vector2D control1, Vector2D control2, Vector2D to)
    {
        AppendPoint(points, from);
        for (var i = 1; i <= CubicBezierSegments; i++)
        {
            var t = (double)i / CubicBezierSegments;
            var point = CubicBezier(from, control1, control2, to, t);
            AppendPoint(points, point);
        }
    }

    private static Vector2D CubicBezier(Vector2D p0, Vector2D p1, Vector2D p2, Vector2D p3, double t)
    {
        var u = 1 - t;
        var tt = t * t;
        var uu = u * u;
        var uuu = uu * u;
        var ttt = tt * t;

        var point = p0 * uuu;
        point += p1 * (3 * uu * t);
        point += p2 * (3 * u * tt);
        point += p3 * ttt;
        return point;
    }

    private static void AppendPoint(List<Vector2D> points, Vector2D point)
    {
        if (points.Count == 0)
        {
            points.Add(point);
            return;
        }

        var last = points[^1];
        if (Math.Abs(last.X - point.X) < DuplicateEpsilon && Math.Abs(last.Y - point.Y) < DuplicateEpsilon)
        {
            return;
        }

        points.Add(point);
    }

    private readonly record struct CubicSegment(Vector2D Control1, Vector2D Control2, Vector2D End);
}
