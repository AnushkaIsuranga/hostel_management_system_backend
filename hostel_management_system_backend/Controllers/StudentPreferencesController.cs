using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

[ApiController]
[Route("api/student-preferences")]
[Authorize]
public sealed class StudentPreferencesController : ControllerBase
{
    private readonly IStudentPreferencesService _service;

    public StudentPreferencesController(IStudentPreferencesService service)
    {
        _service = service;
    }

    [HttpGet("me")]
    public async Task<ActionResult<StudentPreferenceReadDto>> GetMine(CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid token.");

        var preference = await _service.GetMineAsync(userId, cancellationToken);
        return Ok(preference);
    }

    [HttpPut("me")]
    public async Task<ActionResult<StudentPreferenceReadDto>> UpsertMine([FromBody] StudentPreferenceUpsertDto dto, CancellationToken cancellationToken)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized("Invalid token.");

        var preference = await _service.UpsertMineAsync(userId, dto, cancellationToken);
        return Ok(preference);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(sub, out userId);
    }
}
