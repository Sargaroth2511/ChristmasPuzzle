namespace ChristmasPuzzle.Server.Features.Users;

/// <summary>
/// Language preference for the user interface
/// </summary>
public enum Language
{
    German,
    English
}

/// <summary>
/// Salutation preference (formal vs informal)
/// </summary>
public enum Salutation
{
    /// <summary>
    /// Informal address (du)
    /// </summary>
    Informal,
    
    /// <summary>
    /// Formal address (Sie)
    /// </summary>
    Formal
}

/// <summary>
/// Represents user statistics and personalization data
/// </summary>
public class UserData
{
    /// <summary>
    /// Unique identifier for the user (GUID)
    /// </summary>
    public Guid Uid { get; set; } = Guid.NewGuid();

    /// <summary>
    /// User's display name for personalized greeting
    /// </summary>
    public string Name { get; set; } = "Puzzler";

    /// <summary>
    /// Language preference (German or English)
    /// </summary>
    public Language Language { get; set; } = Language.German;

    /// <summary>
    /// Salutation preference - Informal (du) or Formal (Sie)
    /// </summary>
    public Salutation Salutation { get; set; } = Salutation.Informal;

    /// <summary>
    /// Maximum number of puzzle pieces achieved by the user (null until first game result)
    /// </summary>
    public int? MaxPiecesAchieved { get; set; }

    /// <summary>
    /// Fastest completion time in seconds (null if never completed)
    /// </summary>
    public double? FastestTimeSeconds { get; set; }

    /// <summary>
    /// Total number of puzzles completed (null until first game result)
    /// </summary>
    public int? TotalPuzzlesCompleted { get; set; }

    /// <summary>
    /// Last time the user accessed their puzzle (null until first game result)
    /// </summary>
    public DateTime? LastAccessedUtc { get; set; }
}
