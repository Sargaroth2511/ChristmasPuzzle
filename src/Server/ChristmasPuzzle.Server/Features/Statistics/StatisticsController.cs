using Microsoft.AspNetCore.Mvc;

namespace ChristmasPuzzle.Server.Features.Statistics;

[ApiController]
[Route("api/[controller]")]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;
    private readonly ILogger<StatisticsController> _logger;

    public StatisticsController(IStatisticsService statisticsService, ILogger<StatisticsController> logger)
    {
        _statisticsService = statisticsService;
        _logger = logger;
    }

    /// <summary>
    /// Get overview statistics
    /// </summary>
    /// <returns>Statistics overview including totals, averages, and distributions</returns>
    [HttpGet("overview")]
    public async Task<ActionResult<StatisticsOverview>> GetOverview()
    {
        try
        {
            var overview = await _statisticsService.GetOverviewAsync();
            return Ok(overview);
        }
        catch (Exception ex)
        {
            _logger.LogInformation(ex, "Error generating statistics overview");
            return StatusCode(500, new { error = "Error generating statistics" });
        }
    }

    /// <summary>
    /// Get leaderboard rankings
    /// </summary>
    /// <param name="type">Type of leaderboard: fastest, mostPlayed, mostPieces</param>
    /// <param name="limit">Number of entries to return (default: 10, max: 100)</param>
    /// <returns>Leaderboard with rankings</returns>
    [HttpGet("leaderboard")]
    public async Task<ActionResult<LeaderboardResponse>> GetLeaderboard(
        [FromQuery] string type = "fastest",
        [FromQuery] int limit = 10)
    {
        try
        {
            if (limit < 1 || limit > 100)
            {
                return BadRequest(new { error = "Limit must be between 1 and 100" });
            }

            var leaderboardType = type.ToLower() switch
            {
                "fastest" => LeaderboardType.Fastest,
                "mostplayed" => LeaderboardType.MostPlayed,
                _ => LeaderboardType.Fastest
            };

            var leaderboard = await _statisticsService.GetLeaderboardAsync(leaderboardType, limit);
            return Ok(leaderboard);
        }
        catch (Exception ex)
        {
            _logger.LogInformation(ex, "Error generating leaderboard");
            return StatusCode(500, new { error = "Error generating leaderboard" });
        }
    }

    /// <summary>
    /// Get filtered and sorted user list
    /// </summary>
    /// <param name="filter">Filter: all, played, completed, notPlayed</param>
    /// <param name="sortBy">Sort by: name, fastestTime, totalGames, lastPlayed</param>
    /// <returns>List of users with statistics</returns>
    [HttpGet("users")]
    public async Task<ActionResult<UserListResponse>> GetUsers(
        [FromQuery] string filter = "all",
        [FromQuery] string sortBy = "name")
    {
        try
        {
            var userFilter = filter.ToLower() switch
            {
                "all" => UserFilter.All,
                "played" => UserFilter.Played,
                "completed" => UserFilter.Completed,
                "notplayed" => UserFilter.NotPlayed,
                _ => UserFilter.All
            };

            var sortOption = sortBy.ToLower() switch
            {
                "name" => UserSortBy.Name,
                "fastesttime" => UserSortBy.FastestTime,
                "totalgames" => UserSortBy.TotalGames,
                "lastplayed" => UserSortBy.LastPlayed,
                _ => UserSortBy.Name
            };

            var userList = await _statisticsService.GetUserListAsync(userFilter, sortOption);
            return Ok(userList);
        }
        catch (Exception ex)
        {
            _logger.LogInformation(ex, "Error retrieving user list");
            return StatusCode(500, new { error = "Error retrieving user list" });
        }
    }

    /// <summary>
    /// Export statistics to CSV format
    /// </summary>
    /// <returns>CSV file with user statistics</returns>
    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv()
    {
        try
        {
            var csv = await _statisticsService.ExportToCsvAsync();
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var fileName = $"puzzle_statistics_{timestamp}.csv";
            
            return File(
                System.Text.Encoding.UTF8.GetBytes(csv),
                "text/csv",
                fileName
            );
        }
        catch (Exception ex)
        {
            _logger.LogInformation(ex, "Error exporting statistics");
            return StatusCode(500, new { error = "Error exporting statistics" });
        }
    }
}
