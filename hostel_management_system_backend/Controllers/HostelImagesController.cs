using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/hostelimages")]
public sealed class HostelImagesController : ControllerBase
{
    private readonly IHostelImagesService _service;

    public HostelImagesController(IHostelImagesService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    [HttpGet("{hostelId:guid}")]
    public async Task<ActionResult<List<HostelImageReadDto>>> GetImages(Guid hostelId, CancellationToken cancellationToken)
    {
        var images = await _service.GetImagesByHostelIdAsync(hostelId, cancellationToken);
        return Ok(images);
    }

    [Authorize]
    [HttpPost("{hostelId:guid}")]
    public async Task<ActionResult<HostelImageReadDto>> UploadImage(
        Guid hostelId,
        [FromForm] IFormFile file,
        [FromForm] int? displayOrder,
        CancellationToken cancellationToken)
    {
        var userId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());

        var image = await _service.AddImageAsync(hostelId, file, displayOrder, userId, isAdmin, cancellationToken);
        return Ok(image);
    }

    [Authorize]
    [HttpDelete("{imageId:guid}")]
    public async Task<IActionResult> DeleteImage(Guid imageId, CancellationToken cancellationToken)
    {
        var userId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());

        await _service.DeleteImageAsync(imageId, userId, isAdmin, cancellationToken);
        return NoContent();
    }

    [Authorize]
    [HttpPut("{imageId:guid}/order")]
    public async Task<IActionResult> ReorderImage(Guid imageId, [FromBody] UpdateHostelImageOrderDto dto, CancellationToken cancellationToken)
    {
        var userId = GetUserIdOrThrow();
        var isAdmin = User.IsInRole(UserRole.Admin.ToString());

        await _service.UpdateImageOrderAsync(imageId, dto.DisplayOrder, userId, isAdmin, cancellationToken);
        return NoContent();
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
