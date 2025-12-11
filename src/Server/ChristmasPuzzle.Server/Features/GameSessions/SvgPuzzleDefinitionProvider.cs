using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using System.Threading;
using System.Linq;

namespace ChristmasPuzzle.Server.Features.GameSessions;

public interface IPuzzleDefinitionProvider
{
    PuzzleDefinition GetDefinition();
}

/// <summary>
/// Loads puzzle geometry from the shared SVG asset and mirrors the Phaser runtime calculations
/// so the backend can validate placement events.
/// </summary>
public sealed class SvgPuzzleDefinitionProvider : IPuzzleDefinitionProvider
{
    private const double CanvasWidth = 960;
    private const double CanvasHeight = 640;
    private const double PuzzleScaleRatio = 0.9;
    private const double SnapBaseFactor = 0.09;
    private const double SnapToleranceMin = 18;
    private const double SnapToleranceMax = 120;

    private readonly Lazy<PuzzleDefinition> _lazyDefinition;

    public SvgPuzzleDefinitionProvider(IWebHostEnvironment environment, ILogger<SvgPuzzleDefinitionProvider> logger)
    {
        _lazyDefinition = new Lazy<PuzzleDefinition>(() => LoadDefinition(environment, logger), LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public PuzzleDefinition GetDefinition() => _lazyDefinition.Value;

    private static PuzzleDefinition LoadDefinition(IWebHostEnvironment environment, ILogger logger)
    {
        var svgPath = ResolveSvgPath(environment, logger);
        if (svgPath == null)
        {
            throw new InvalidOperationException("Unable to locate puzzle SVG asset.");
        }

        logger.LogInformation("Loading puzzle definition from {SvgPath}", svgPath);
        var svgContent = File.ReadAllText(svgPath);
        var checksum = ComputeChecksum(svgContent);

        var document = XDocument.Parse(svgContent);
        var root = document.Root ?? throw new InvalidOperationException("SVG document is empty.");

        var ns = root.Name.Namespace;
        var outlinePath = root.Descendants().FirstOrDefault(el => el.Attribute("id")?.Value == "outline");
        if (outlinePath == null)
        {
            throw new InvalidOperationException("SVG outline path (#outline) not found.");
        }

        var outlinePoints = SvgPathSampler.SamplePath(outlinePath.Attribute("d")?.Value ?? string.Empty);

        var pieceElements = root.Descendants()
            .Where(el => el.Attribute("id")?.Value?.StartsWith("piece_", StringComparison.OrdinalIgnoreCase) == true)
            .ToList();

        if (pieceElements.Count == 0)
        {
            throw new InvalidOperationException("No puzzle pieces found in SVG.");
        }

        var piecesRaw = new List<RawPiece>();
        foreach (var element in pieceElements)
        {
            var id = element.Attribute("id")?.Value;
            if (string.IsNullOrWhiteSpace(id))
            {
                continue;
            }

            var data = element.Attribute("d")?.Value;
            if (string.IsNullOrWhiteSpace(data))
            {
                logger.LogWarning("Skipping piece {PieceId} without path data.", id);
                continue;
            }

            var points = SvgPathSampler.SamplePath(data);
            if (points.Count == 0)
            {
                logger.LogWarning("Skipping piece {PieceId} with no sampled points.", id);
                continue;
            }

            var centroid = GeometryUtilities.ComputeCentroid(points);
            piecesRaw.Add(new RawPiece(id, points, centroid));
        }

        if (piecesRaw.Count == 0)
        {
            throw new InvalidOperationException("Failed to sample any puzzle pieces from SVG.");
        }

        var bounds = GeometryUtilities.ComputeBounds(outlinePoints, piecesRaw.SelectMany(p => p.Points));
        var scale = GeometryUtilities.CalculateUniformScale(bounds, CanvasWidth, CanvasHeight, PuzzleScaleRatio);
        var offsets = GeometryUtilities.CalculateOffsets(bounds, scale, CanvasWidth, CanvasHeight);

        var pieceMap = new Dictionary<string, PuzzlePieceDefinition>(StringComparer.OrdinalIgnoreCase);

        foreach (var rawPiece in piecesRaw)
        {
            var canvasPoints = rawPiece.Points.Select(pt => GeometryUtilities.ToCanvasPoint(pt, bounds, scale, offsets)).ToList();
            var canvasCentroid = GeometryUtilities.ToCanvasPoint(rawPiece.Centroid, bounds, scale, offsets);
            var footprintBounds = GeometryUtilities.ComputeBounds(canvasPoints);

            var maxAxis = Math.Max(footprintBounds.Width, footprintBounds.Height);
            var tolerance = Math.Clamp(maxAxis * SnapBaseFactor, SnapToleranceMin, SnapToleranceMax);

            pieceMap[rawPiece.Id] = new PuzzlePieceDefinition
            {
                Id = rawPiece.Id,
                TargetX = canvasCentroid.X,
                TargetY = canvasCentroid.Y,
                SnapTolerance = tolerance,
                Width = footprintBounds.Width,
                Height = footprintBounds.Height
            };
        }

        var definition = new PuzzleDefinition
        {
            PuzzleId = Path.GetFileNameWithoutExtension(svgPath),
            Version = checksum,
            CanvasWidth = CanvasWidth,
            CanvasHeight = CanvasHeight,
            Pieces = pieceMap
        };

        logger.LogInformation("Loaded puzzle definition with {PieceCount} pieces (version {Version}).", definition.Pieces.Count, definition.Version);
        return definition;
    }

    private static string? ResolveSvgPath(IWebHostEnvironment environment, ILogger logger)
    {
        var candidates = new[]
        {
            Path.Combine(environment.WebRootPath ?? string.Empty, "assets", "pieces", "stag_with_all_lines.svg"),
            Path.Combine(environment.ContentRootPath, "assets", "pieces", "stag_with_all_lines.svg"),
            Path.Combine(environment.ContentRootPath, "..", "..", "..", "ClientApp", "src", "assets", "pieces", "stag_with_all_lines.svg"),
            Path.Combine(environment.ContentRootPath, "..", "ClientApp", "src", "assets", "pieces", "stag_with_all_lines.svg")
        };

        foreach (var path in candidates.Select(Path.GetFullPath))
        {
            try
            {
                if (File.Exists(path))
                {
                    return path;
                }
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Failed to probe SVG path {SvgCandidate}.", path);
            }
        }

        logger.LogInformation("Puzzle SVG could not be located using known search paths.");
        return null;
    }

    private static string ComputeChecksum(string content)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(content);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToHexString(hash);
    }

    private sealed record RawPiece(string Id, IReadOnlyList<Vector2D> Points, Vector2D Centroid);
}
