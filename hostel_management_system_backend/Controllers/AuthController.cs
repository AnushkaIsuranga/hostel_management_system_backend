using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthTokensResponseDto>> Login([FromBody] LoginRequestDto dto, CancellationToken cancellationToken)
    {
        var result = await _authService.LoginAsync(dto, cancellationToken);
        if (result is null)
        {
            return Unauthorized("Invalid email or password.");
        }

        WriteRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [AllowAnonymous]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthTokensResponseDto>> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = ReadRefreshCookie();
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized("Refresh token is missing.");
        }

        var result = await _authService.RefreshAsync(refreshToken, cancellationToken);
        if (result is null)
        {
            DeleteRefreshCookie();
            return Unauthorized("Session expired. Please log in again.");
        }

        WriteRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return Ok(result.Response);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var refreshToken = ReadRefreshCookie();
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            await _authService.LogoutAsync(refreshToken, cancellationToken);
        }

        DeleteRefreshCookie();
        return NoContent();
    }

    private string GetRefreshCookieName()
    {
        return _configuration["AuthSettings:RefreshCookieName"] ?? "refreshToken";
    }

    private string? ReadRefreshCookie()
    {
        Request.Cookies.TryGetValue(GetRefreshCookieName(), out var refreshToken);
        return refreshToken;
    }

    private void WriteRefreshCookie(string token, DateTime expiresAt)
    {
        Response.Cookies.Append(
            GetRefreshCookieName(),
            token,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = new DateTimeOffset(expiresAt)
            }
        );
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(GetRefreshCookieName());
    }
}
