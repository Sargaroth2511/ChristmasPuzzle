using System.Text.Json;

namespace ChristmasPuzzle.Server.Features.Users;

/// <summary>
/// Service for managing user data stored in JSON file
/// </summary>
public interface IUserDataService
{
    /// <summary>
    /// Get user data by unique identifier, creating a new user if not found
    /// </summary>
    Task<UserData> GetUserDataAsync(Guid uid, string? name = null, Language? language = null, Salutation? salutation = null);

    /// <summary>
    /// Update user statistics based on game progress
    /// </summary>
    Task<UserData> UpdateUserStatsAsync(Guid uid, UpdateUserStatsRequest request);
}

public class UserDataService : IUserDataService
{
    private readonly string _dataFilePath;
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    private readonly ILogger<UserDataService> _logger;

    public UserDataService(IWebHostEnvironment environment, ILogger<UserDataService> logger)
    {
        _logger = logger;
        // Store user data in App_Data folder
        var appDataPath = Path.Combine(environment.ContentRootPath, "App_Data");
        
        // Ensure App_Data directory exists
        if (!Directory.Exists(appDataPath))
        {
            Directory.CreateDirectory(appDataPath);
        }

        _dataFilePath = Path.Combine(appDataPath, "users.json");

        // Initialize file if it doesn't exist
        if (!File.Exists(_dataFilePath))
        {
            var initialData = new UsersDataStore { Users = new List<UserData>() };
            File.WriteAllText(_dataFilePath, JsonSerializer.Serialize(initialData, new JsonSerializerOptions
            {
                WriteIndented = true
            }));
        }
    }

    public async Task<UserData> GetUserDataAsync(Guid uid, string? name = null, Language? language = null, Salutation? salutation = null)
    {
        await _fileLock.WaitAsync();
        try
        {
            var store = await ReadDataStoreAsync();
            _logger.LogInformation("Loaded {Count} users from store, searching for UID: {Uid}", store.Users.Count, uid);
            var user = store.Users.FirstOrDefault(u => u.Uid == uid);

            if (user == null)
            {
                _logger.LogWarning("User with UID {Uid} not found in store", uid);
                // Return 404 - don't create new user
                throw new InvalidOperationException($"User with UID {uid} not found");
            }
            
            _logger.LogInformation("Found user: {Name}, Language: {Language}, Salutation: {Salutation}", 
                user.Name, user.Language, user.Salutation);

            return user;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<UserData> UpdateUserStatsAsync(Guid uid, UpdateUserStatsRequest request)
    {
        await _fileLock.WaitAsync();
        try
        {
            var store = await ReadDataStoreAsync();
            var user = store.Users.FirstOrDefault(u => u.Uid == uid);

            if (user == null)
            {
                throw new InvalidOperationException($"User with UID {uid} not found");
            }

            // Update max pieces achieved
            if (!user.MaxPiecesAchieved.HasValue || request.PiecesAchieved > user.MaxPiecesAchieved.Value)
            {
                user.MaxPiecesAchieved = request.PiecesAchieved;
                _logger.LogInformation("User {Uid} achieved new max pieces: {MaxPieces}", uid, request.PiecesAchieved);
            }

            // Update fastest time if puzzle was completed
            if (request.PuzzleCompleted && request.CompletionTimeSeconds.HasValue)
            {
                if (!user.FastestTimeSeconds.HasValue || request.CompletionTimeSeconds.Value < user.FastestTimeSeconds.Value)
                {
                    user.FastestTimeSeconds = request.CompletionTimeSeconds.Value;
                    _logger.LogInformation("User {Uid} achieved new fastest time: {Time}s", uid, request.CompletionTimeSeconds.Value);
                }

                user.TotalPuzzlesCompleted = (user.TotalPuzzlesCompleted ?? 0) + 1;
            }

            user.LastAccessedUtc = DateTime.UtcNow;

            await WriteDataStoreAsync(store);
            return user;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    private async Task<UsersDataStore> ReadDataStoreAsync()
    {
        try
        {
            var json = await File.ReadAllTextAsync(_dataFilePath);
            var store = JsonSerializer.Deserialize<UsersDataStore>(json);
            return store ?? new UsersDataStore { Users = new List<UserData>() };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading user data file");
            return new UsersDataStore { Users = new List<UserData>() };
        }
    }

    private async Task WriteDataStoreAsync(UsersDataStore store)
    {
        try
        {
            var json = JsonSerializer.Serialize(store, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            await File.WriteAllTextAsync(_dataFilePath, json);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error writing user data file");
            throw;
        }
    }

    private class UsersDataStore
    {
        public List<UserData> Users { get; set; } = new();
    }
}
