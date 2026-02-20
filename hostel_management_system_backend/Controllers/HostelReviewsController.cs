using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/hostels/{hostelId:guid}/reviews")]
public sealed class HostelReviewsController : ControllerBase
{
    private readonly IHostelReviewsService _service;

    public HostelReviewsController(IHostelReviewsService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<HostelReviewReadDto>>> GetForHostel(Guid hostelId, CancellationToken cancellationToken)
    {
        var reviews = await _service.GetForHostelAsync(hostelId, cancellationToken);
        return Ok(reviews);
    }

    [AllowAnonymous]
    [HttpGet("summary")]
    public async Task<ActionResult<HostelRatingSummaryDto>> GetSummary(Guid hostelId, CancellationToken cancellationToken)
    {
        var summary = await _service.GetSummaryAsync(hostelId, cancellationToken);
        return Ok(summary);
    }

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<HostelReviewReadDto>> Create(Guid hostelId, [FromBody] HostelReviewCreateDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserIdOrThrow();
        var created = await _service.CreateAsync(hostelId, userId, dto, cancellationToken);
        return CreatedAtAction(nameof(GetForHostel), new { hostelId }, created);
    }

    [Authorize]
    [HttpPut("{reviewId:guid}")]
    public async Task<ActionResult<HostelReviewReadDto>> Update(Guid hostelId, Guid reviewId, [FromBody] HostelReviewUpdateDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());
        var updated = await _service.UpdateAsync(hostelId, reviewId, userId, isAdmin, dto, cancellationToken);
        return Ok(updated);
    }

    [Authorize]
    [HttpDelete("{reviewId:guid}")]
    public async Task<IActionResult> Delete(Guid hostelId, Guid reviewId, CancellationToken cancellationToken)
    {
        var userId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());
        await _service.DeleteAsync(hostelId, reviewId, userId, isAdmin, cancellationToken);
        return NoContent();
    }

    private Guid GetUserIdOrThrow()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var userId))
        {
            throw new UnauthorizedException("Invalid access token.", "invalid_token");
        }

        return userId;
    }
}
