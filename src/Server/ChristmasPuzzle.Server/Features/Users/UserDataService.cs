using System.Text.Json;
using ChristmasPuzzle.Server.Features.GameSessions;

namespace ChristmasPuzzle.Server.Features.Users;

/// <summary>
/// Service for managing user data stored in JSON file
/// </summary>
public interface IUserDataService
{
    /// <summary>
    /// Get user data by unique identifier, creating a new user if not found
    /// </summary>
    Task<UserData> GetUserDataAsync(Guid uid, string? firstName = null, string? lastName = null, Language? language = null, Salutation? salutation = null);

    /// <summary>
    /// Update user statistics based on game progress
    /// </summary>
    Task<UserData> UpdateUserStatsAsync(Guid uid, UpdateUserStatsRequest request);

    /// <summary>
    /// Apply a validated game session result produced by the backend to the user's statistics.
    /// </summary>
    Task<UserData> ApplyGameSessionResultAsync(Guid uid, GameSessionOutcome outcome);
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
        // In production (IIS), look relative to the executable location, not content root
        var exeLocation = System.Reflection.Assembly.GetExecutingAssembly().Location;
        var exeDirectory = Path.GetDirectoryName(exeLocation) ?? environment.ContentRootPath;
        var appDataPath = Path.Combine(exeDirectory, "App_Data");
        
        // Ensure App_Data directory exists
        if (!Directory.Exists(appDataPath))
        {
            Directory.CreateDirectory(appDataPath);
        }

        _dataFilePath = Path.Combine(appDataPath, "users.json");

        // Initialize or merge with seed data
        InitializeDataFile(exeDirectory);
    }

    /// <summary>
    /// Initialize data file by merging seed profiles with existing game progress
    /// </summary>
    private void InitializeDataFile(string exeDirectory)
    {
        // Read seed data (profile info only)
        var seedFilePath = Path.Combine(exeDirectory, "seed-users.json");
        UsersDataStore? seedData = null;
        
        if (File.Exists(seedFilePath))
        {
            try
            {
                var seedJson = File.ReadAllText(seedFilePath);
                seedData = JsonSerializer.Deserialize<UsersDataStore>(seedJson);
                _logger.LogInformation("Loaded {Count} seed users from {Path}", seedData?.Users.Count ?? 0, seedFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error reading seed users file");
            }
        }
        else
        {
            _logger.LogWarning("Seed users file not found at: {Path}", seedFilePath);
        }

        // Read existing user data (game progress)
        UsersDataStore? existingData = null;
        
        if (File.Exists(_dataFilePath))
        {
            try
            {
                var existingJson = File.ReadAllText(_dataFilePath);
                existingData = JsonSerializer.Deserialize<UsersDataStore>(existingJson);
                _logger.LogInformation("Loaded {Count} existing users from {Path}", existingData?.Users.Count ?? 0, _dataFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error reading existing users file");
            }
        }

        // Merge: Update profiles from seed while preserving game progress
        var mergedUsers = new List<UserData>();

        if (seedData?.Users != null)
        {
            foreach (var seedUser in seedData.Users)
            {
                // Find existing user by Uid
                var existingUser = existingData?.Users.FirstOrDefault(u => u.Uid == seedUser.Uid);

                if (existingUser != null)
                {
                    // Update profile info from seed, keep game progress from existing
                    existingUser.FirstName = seedUser.FirstName;
                    existingUser.LastName = seedUser.LastName;
                    existingUser.Language = seedUser.Language;
                    existingUser.Salutation = seedUser.Salutation;
                    mergedUsers.Add(existingUser);
                    _logger.LogInformation("Updated profile for user {Uid}: {FirstName} {LastName}", 
                        existingUser.Uid, existingUser.FirstName, existingUser.LastName);
                }
                else
                {
                    // New user from seed - add with no game progress
                    mergedUsers.Add(seedUser);
                    _logger.LogInformation("Added new user from seed: {Uid} - {FirstName} {LastName}", 
                        seedUser.Uid, seedUser.FirstName, seedUser.LastName);
                }
            }
        }

        // Preserve users that exist in data file but not in seed
        if (existingData?.Users != null)
        {
            foreach (var existingUser in existingData.Users)
            {
                if (seedData?.Users == null || !seedData.Users.Any(s => s.Uid == existingUser.Uid))
                {
                    mergedUsers.Add(existingUser);
                    _logger.LogInformation("Preserved existing user not in seed: {Uid} - {FirstName} {LastName}", 
                        existingUser.Uid, existingUser.FirstName, existingUser.LastName);
                }
            }
        }

        // Write merged data
        var mergedStore = new UsersDataStore { Users = mergedUsers };
        File.WriteAllText(_dataFilePath, JsonSerializer.Serialize(mergedStore, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
        
        _logger.LogInformation("Initialized users.json with {Count} total users", mergedUsers.Count);
    }

    public async Task<UserData> GetUserDataAsync(Guid uid, string? firstName = null, string? lastName = null, Language? language = null, Salutation? salutation = null)
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
            
            _logger.LogInformation("Found user: {FirstName} {LastName}, Language: {Language}, Salutation: {Salutation}", 
                user.FirstName, user.LastName, user.Language, user.Salutation);

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

    public Task<UserData> ApplyGameSessionResultAsync(Guid uid, GameSessionOutcome outcome)
    {
        var sanitizedRequest = new UpdateUserStatsRequest
        {
            PiecesAchieved = outcome.PiecesPlaced,
            CompletionTimeSeconds = outcome.DurationSeconds,
            PuzzleCompleted = true
        };

        return UpdateUserStatsAsync(uid, sanitizedRequest);
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
            _logger.LogWarning(ex, "Error reading user data file");
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
            _logger.LogWarning(ex, "Error writing user data file");
            throw;
        }
    }

    private class UsersDataStore
    {
        public List<UserData> Users { get; set; } = new();
    }
}
