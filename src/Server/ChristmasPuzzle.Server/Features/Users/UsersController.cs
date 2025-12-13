using Microsoft.AspNetCore.Mvc;

namespace ChristmasPuzzle.Server.Features.Users;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserDataService _userDataService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserDataService userDataService, ILogger<UsersController> logger)
    {
        _userDataService = userDataService;
        _logger = logger;
    }

    /// <summary>
    /// Get user data by UID. Creates a new user if UID doesn't exist.
    /// </summary>
    /// <param name="uid">Unique user identifier (GUID)</param>
    /// <param name="firstName">Optional user first name (used only when creating new user)</param>
    /// <param name="lastName">Optional user last name (used only when creating new user)</param>
    /// <param name="language">Optional language preference: 0=German (default), 1=English</param>
    /// <param name="salutation">Optional salutation: 0=Informal/du (default), 1=Formal/Sie</param>
    /// <returns>User data including stats and personalization</returns>
    [HttpGet("{uid:guid}")]
    public async Task<ActionResult<UserData>> GetUser(
        Guid uid, 
        [FromQuery] string? firstName = null,
        [FromQuery] string? lastName = null,
        [FromQuery] Language? language = null,
        [FromQuery] Salutation? salutation = null)
    {
        try
        {
            if (uid == Guid.Empty)
            {
                return BadRequest(new { error = "UID must be a valid GUID" });
            }

            var userData = await _userDataService.GetUserDataAsync(uid, firstName, lastName, language, salutation);
            return Ok(userData);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("not found"))
        {
            _logger.LogWarning("User {Uid} not found", uid);
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting user data for UID: {Uid}", uid);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Update user statistics after game progress or completion
    /// </summary>
    /// <param name="uid">Unique user identifier (GUID)</param>
    /// <param name="request">Statistics update request</param>
    /// <returns>Updated user data</returns>
    [HttpPost("{uid:guid}/stats")]
    public async Task<ActionResult<UserData>> UpdateStats(Guid uid, [FromBody] UpdateUserStatsRequest request)
    {
        try
        {
            if (uid == Guid.Empty)
            {
                return BadRequest(new { error = "UID must be a valid GUID" });
            }

            if (request.PiecesAchieved < 0)
            {
                return BadRequest(new { error = "Pieces achieved cannot be negative" });
            }

            if (request.CompletionTimeSeconds.HasValue && request.CompletionTimeSeconds.Value < 0)
            {
                return BadRequest(new { error = "Completion time cannot be negative" });
            }

            var userData = await _userDataService.UpdateUserStatsAsync(uid, request);
            return Ok(userData);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "User not found for UID: {Uid}", uid);
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error updating user stats for UID: {Uid}", uid);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
