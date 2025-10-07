namespace ChristmasPuzzle.Server.Features.Users;

/// <summary>
/// Request to update user statistics after puzzle completion or progress
/// </summary>
public class UpdateUserStatsRequest
{
    /// <summary>
    /// Number of pieces placed in this session
    /// </summary>
    public int PiecesAchieved { get; set; }

    /// <summary>
    /// Completion time in seconds (null if puzzle not completed)
    /// </summary>
    public double? CompletionTimeSeconds { get; set; }

    /// <summary>
    /// Whether the puzzle was completed
    /// </summary>
    public bool PuzzleCompleted { get; set; }
}
