using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api")]
public sealed class HostelVerificationController : ControllerBase
{
    private readonly IHostelVerificationService _verificationService;

    public HostelVerificationController(IHostelVerificationService verificationService)
    {
        _verificationService = verificationService;
    }

    [Authorize]
    [HttpPost("hostels/{hostelId:guid}/verification/request")]
    public async Task<ActionResult<HostelVerificationRequestReadDto>> RequestVerification(Guid hostelId, CancellationToken cancellationToken)
    {
        var ownerId = GetUserIdOrThrow();
        var created = await _verificationService.RequestVerificationAsync(hostelId, ownerId, cancellationToken);
        return Ok(created);
    }

    [Authorize]
    [HttpPost("verification-requests/{requestId:guid}/approve")]
    public async Task<ActionResult<HostelVerificationRequestReadDto>> Approve(Guid requestId, [FromBody] ReviewVerificationRequestDto dto, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var adminId = GetUserIdOrThrow();
        var approved = await _verificationService.ApproveVerificationAsync(requestId, adminId, dto.AdminNotes, cancellationToken);
        return Ok(approved);
    }

    [Authorize]
    [HttpPost("verification-requests/{requestId:guid}/reject")]
    public async Task<ActionResult<HostelVerificationRequestReadDto>> Reject(Guid requestId, [FromBody] ReviewVerificationRequestDto dto, CancellationToken cancellationToken)
    {
        EnsureAdmin();
        var adminId = GetUserIdOrThrow();
        var rejected = await _verificationService.RejectVerificationAsync(requestId, adminId, dto.AdminNotes, cancellationToken);
        return Ok(rejected);
    }

    [Authorize]
    [HttpGet("hostels/{hostelId:guid}/verification/requests")]
    public async Task<ActionResult<List<HostelVerificationRequestReadDto>>> GetForHostel(Guid hostelId, CancellationToken cancellationToken)
    {
        var requesterId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());
        var requests = await _verificationService.GetForHostelAsync(hostelId, requesterId, isAdmin, cancellationToken);
        return Ok(requests);
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

    private void EnsureAdmin()
    {
        if (!User.IsInRole(UserRole.Admin.ToString()))
        {
            throw new ForbiddenException("Only admins can review verification requests.", "admin_only");
        }
    }
}
