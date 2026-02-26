using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/hostels/{hostelId:guid}/subscription")]
public sealed class HostelSubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;

    public HostelSubscriptionsController(ISubscriptionService subscriptionService)
    {
        _subscriptionService = subscriptionService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<HostelSubscriptionReadDto>> Get(Guid hostelId, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());

        var subscription = await _subscriptionService.GetAsync(hostelId, actorUserId, isAdmin, cancellationToken);
        return subscription is null ? NotFound() : Ok(subscription);
    }

    [Authorize]
    [HttpPut]
    public async Task<ActionResult<HostelSubscriptionReadDto>> Upsert(Guid hostelId, [FromBody] UpsertHostelSubscriptionDto dto, CancellationToken cancellationToken)
    {
        var actorUserId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());

        var upserted = await _subscriptionService.UpsertAsync(hostelId, actorUserId, isAdmin, dto, cancellationToken);
        return Ok(upserted);
    }

    private Guid GetUserIdOrThrow()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(sub, out var userId))
        {
            throw new UnauthorizedException("Invalid access token.", "invalid_token");
        }

        return userId;
    }
}
