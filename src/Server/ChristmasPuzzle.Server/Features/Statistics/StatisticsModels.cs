namespace ChristmasPuzzle.Server.Features.Statistics;

/// <summary>
/// Response model for statistics overview
/// </summary>
public class StatisticsOverview
{
    public DateTime GeneratedAt { get; set; }
    public int TotalUsers { get; set; }
    public int UsersWhoPlayed { get; set; }
    public int UsersWhoCompleted { get; set; }
    public double CompletionRate { get; set; }
    public double? AverageCompletionTimeSeconds { get; set; }
    public double? MedianCompletionTimeSeconds { get; set; }
    public double? FastestTimeSeconds { get; set; }
    public int TotalGamesPlayed { get; set; }
    public decimal CollectedDonations { get; set; }
    public LanguageStats Languages { get; set; } = new();
    public SalutationStats Salutations { get; set; } = new();
}

public class LanguageStats
{
    public int German { get; set; }
    public int English { get; set; }
}

public class SalutationStats
{
    public int Informal { get; set; }
    public int Formal { get; set; }
}

/// <summary>
/// Leaderboard entry for rankings
/// </summary>
public class LeaderboardEntry
{
    public int Rank { get; set; }
    public string Name { get; set; } = string.Empty;
    public double? TimeSeconds { get; set; }
    public string TimeFormatted { get; set; } = string.Empty;
    public int? TotalGamesPlayed { get; set; }
    public DateTime? LastAccessed { get; set; }
}

/// <summary>
/// Response model for leaderboard
/// </summary>
public class LeaderboardResponse
{
    public DateTime GeneratedAt { get; set; }
    public string Type { get; set; } = string.Empty;
    public int TotalEntries { get; set; }
    public List<LeaderboardEntry> Entries { get; set; } = new();
}

/// <summary>
/// User detail for full user list
/// </summary>
public class UserStatDetail
{
    public Guid Uid { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Salutation { get; set; } = string.Empty;
    public double? FastestTimeSeconds { get; set; }
    public string? FastestTimeFormatted { get; set; }
    public int? TotalPuzzlesCompleted { get; set; }
    public DateTime? LastAccessedUtc { get; set; }
    public bool HasPlayed { get; set; }
    public bool HasCompleted { get; set; }
}

/// <summary>
/// Response model for user list
/// </summary>
public class UserListResponse
{
    public DateTime GeneratedAt { get; set; }
    public string Filter { get; set; } = string.Empty;
    public int TotalUsers { get; set; }
    public List<UserStatDetail> Users { get; set; } = new();
}

/// <summary>
/// Filter options for user queries
/// </summary>
public enum UserFilter
{
    All,
    Played,
    Completed,
    NotPlayed
}

/// <summary>
/// Sort options for user list
/// </summary>
public enum UserSortBy
{
    Name,
    FastestTime,
    TotalGames,
    LastPlayed
}

/// <summary>
/// Leaderboard type
/// </summary>
public enum LeaderboardType
{
    Fastest,
    MostPlayed
}
