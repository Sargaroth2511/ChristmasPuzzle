using ChristmasPuzzle.Server.Features.Puzzle;
using Microsoft.AspNetCore.Mvc;

namespace ChristmasPuzzle.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PuzzleController : ControllerBase
{
    [HttpGet]
    public ActionResult<PuzzleConfigDto> Get() => Ok(StarPuzzleFactory.Create());
}
