using ChristmasPuzzle.Server.Features.Users;

namespace ChristmasPuzzle.Server.Features.Statistics;

public interface IStatisticsService
{
    Task<StatisticsOverview> GetOverviewAsync();
    Task<LeaderboardResponse> GetLeaderboardAsync(LeaderboardType type, int limit);
    Task<UserListResponse> GetUserListAsync(UserFilter filter, UserSortBy sortBy);
    Task<string> ExportToCsvAsync();
}

public class StatisticsService : IStatisticsService
{
    private readonly IUserDataService _userDataService;
    private readonly ILogger<StatisticsService> _logger;

    public StatisticsService(IUserDataService userDataService, ILogger<StatisticsService> logger)
    {
        _userDataService = userDataService;
        _logger = logger;
    }

    public async Task<StatisticsOverview> GetOverviewAsync()
    {
        var allUsers = await GetAllUsersAsync();
        
        var usersWhoPlayed = allUsers.Where(u => u.TotalPuzzlesCompleted.HasValue && u.TotalPuzzlesCompleted > 0).ToList();
        var usersWhoCompleted = allUsers.Where(u => u.FastestTimeSeconds.HasValue).ToList();
        
        var completionTimes = usersWhoCompleted
            .Where(u => u.FastestTimeSeconds.HasValue)
            .Select(u => u.FastestTimeSeconds!.Value)
            .OrderBy(t => t)
            .ToList();

        var totalGamesCompleted = usersWhoCompleted.Count;
        var collectedDonations = totalGamesCompleted * 22m;

        return new StatisticsOverview
        {
            GeneratedAt = DateTime.UtcNow,
            TotalUsers = allUsers.Count,
            UsersWhoPlayed = usersWhoPlayed.Count,
            UsersWhoCompleted = usersWhoCompleted.Count,
            CompletionRate = allUsers.Count > 0 ? (double)usersWhoCompleted.Count / allUsers.Count * 100 : 0,
            AverageCompletionTimeSeconds = completionTimes.Any() ? completionTimes.Average() : null,
            MedianCompletionTimeSeconds = completionTimes.Any() ? GetMedian(completionTimes) : null,
            FastestTimeSeconds = completionTimes.Any() ? completionTimes.Min() : null,
            TotalGamesPlayed = usersWhoPlayed.Sum(u => u.TotalPuzzlesCompleted ?? 0),
            CollectedDonations = collectedDonations,
            Languages = new LanguageStats
            {
                German = allUsers.Count(u => u.Language == Language.German),
                English = allUsers.Count(u => u.Language == Language.English)
            },
            Salutations = new SalutationStats
            {
                Informal = allUsers.Count(u => u.Salutation == Salutation.Informal),
                Formal = allUsers.Count(u => u.Salutation == Salutation.Formal)
            }
        };
    }

    public async Task<LeaderboardResponse> GetLeaderboardAsync(LeaderboardType type, int limit)
    {
        var allUsers = await GetAllUsersAsync();
        List<UserData> filteredUsers;
        string typeString;

        switch (type)
        {
            case LeaderboardType.Fastest:
                filteredUsers = allUsers
                    .Where(u => u.FastestTimeSeconds.HasValue)
                    .OrderBy(u => u.FastestTimeSeconds)
                    .Take(limit)
                    .ToList();
                typeString = "Fastest Completion Times";
                break;

            case LeaderboardType.MostPlayed:
                filteredUsers = allUsers
                    .Where(u => u.TotalPuzzlesCompleted.HasValue && u.TotalPuzzlesCompleted > 0)
                    .OrderByDescending(u => u.TotalPuzzlesCompleted)
                    .Take(limit)
                    .ToList();
                typeString = "Most Games Played";
                break;



            default:
                filteredUsers = new List<UserData>();
                typeString = "Unknown";
                break;
        }

        var entries = filteredUsers.Select((user, index) => new LeaderboardEntry
        {
            Rank = index + 1,
            Name = $"{user.FirstName} {user.LastName}",
            TimeSeconds = user.FastestTimeSeconds,
            TimeFormatted = FormatTime(user.FastestTimeSeconds),
            TotalGamesPlayed = user.TotalPuzzlesCompleted,
            LastAccessed = user.LastAccessedUtc
        }).ToList();

        return new LeaderboardResponse
        {
            GeneratedAt = DateTime.UtcNow,
            Type = typeString,
            TotalEntries = entries.Count,
            Entries = entries
        };
    }

    public async Task<UserListResponse> GetUserListAsync(UserFilter filter, UserSortBy sortBy)
    {
        var allUsers = await GetAllUsersAsync();
        
        // Apply filter
        IEnumerable<UserData> filteredUsers = filter switch
        {
            UserFilter.Played => allUsers.Where(u => u.TotalPuzzlesCompleted.HasValue && u.TotalPuzzlesCompleted > 0),
            UserFilter.Completed => allUsers.Where(u => u.FastestTimeSeconds.HasValue),
            UserFilter.NotPlayed => allUsers.Where(u => !u.TotalPuzzlesCompleted.HasValue || u.TotalPuzzlesCompleted == 0),
            _ => allUsers
        };

        // Apply sorting
        filteredUsers = sortBy switch
        {
            UserSortBy.Name => filteredUsers.OrderBy(u => u.LastName).ThenBy(u => u.FirstName),
            UserSortBy.FastestTime => filteredUsers.OrderBy(u => u.FastestTimeSeconds ?? double.MaxValue),
            UserSortBy.TotalGames => filteredUsers.OrderByDescending(u => u.TotalPuzzlesCompleted ?? 0),
            UserSortBy.LastPlayed => filteredUsers.OrderByDescending(u => u.LastAccessedUtc ?? DateTime.MinValue),
            _ => filteredUsers.OrderBy(u => u.LastName)
        };

        var userDetails = filteredUsers.Select(u => new UserStatDetail
        {
            Uid = u.Uid,
            FirstName = u.FirstName,
            LastName = u.LastName,
            FullName = $"{u.FirstName} {u.LastName}",
            Language = u.Language.ToString(),
            Salutation = u.Salutation.ToString(),
            FastestTimeSeconds = u.FastestTimeSeconds,
            FastestTimeFormatted = FormatTime(u.FastestTimeSeconds),
            TotalPuzzlesCompleted = u.TotalPuzzlesCompleted,
            LastAccessedUtc = u.LastAccessedUtc,
            HasPlayed = u.TotalPuzzlesCompleted.HasValue && u.TotalPuzzlesCompleted > 0,
            HasCompleted = u.FastestTimeSeconds.HasValue
        }).ToList();

        return new UserListResponse
        {
            GeneratedAt = DateTime.UtcNow,
            Filter = filter.ToString(),
            TotalUsers = userDetails.Count,
            Users = userDetails
        };
    }

    public async Task<string> ExportToCsvAsync()
    {
        var allUsers = await GetAllUsersAsync();
        
        var csv = new System.Text.StringBuilder();
        csv.AppendLine("FirstName,LastName,Language,Salutation,FastestTime,TotalGames,LastAccessed");

        foreach (var user in allUsers.OrderBy(u => u.LastName).ThenBy(u => u.FirstName))
        {
            csv.AppendLine($"{EscapeCsv(user.FirstName)},{EscapeCsv(user.LastName)}," +
                          $"{user.Language},{user.Salutation}," +
                          $"{user.FastestTimeSeconds?.ToString("F2") ?? ""}," +
                          $"{user.TotalPuzzlesCompleted?.ToString() ?? ""}," +
                          $"{user.LastAccessedUtc?.ToString("yyyy-MM-dd HH:mm:ss") ?? ""}");
        }

        return csv.ToString();
    }

    private async Task<List<UserData>> GetAllUsersAsync()
    {
        // We need to read the users.json file directly since UserDataService doesn't have a GetAll method
        // This is a simplified version - you might want to add this to IUserDataService
        var appDataPath = Path.Combine(AppContext.BaseDirectory, "App_Data");
        var dataFilePath = Path.Combine(appDataPath, "users.json");

        if (!File.Exists(dataFilePath))
        {
            return new List<UserData>();
        }

        var json = await File.ReadAllTextAsync(dataFilePath);
        var store = System.Text.Json.JsonSerializer.Deserialize<UsersDataStore>(json);
        
        return store?.Users ?? new List<UserData>();
    }

    private static double GetMedian(List<double> values)
    {
        if (values.Count == 0) return 0;
        
        var sorted = values.OrderBy(x => x).ToList();
        int mid = sorted.Count / 2;
        
        if (sorted.Count % 2 == 0)
        {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        
        return sorted[mid];
    }

    private static string FormatTime(double? seconds)
    {
        if (!seconds.HasValue) return "";
        
        var mins = (int)(seconds.Value / 60);
        var secs = (int)(seconds.Value % 60);
        return $"{mins}:{secs:D2}";
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}

// Helper class to deserialize users.json
file class UsersDataStore
{
    public List<UserData> Users { get; set; } = new();
}
