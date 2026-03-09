using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using hostel_management_system_backend.Exceptions;

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
        var result = await _authService.LoginAsync(dto, cancellationToken)
            ?? throw new UnauthorizedException("Invalid email or password.");

        WriteRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt, result.Response.Role == UserRole.Admin);
        return Ok(result.Response);
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthTokensResponseDto>> Register([FromBody] UserRegisterDto dto, CancellationToken cancellationToken)
    {
        var result = await _authService.RegisterAsync(dto, cancellationToken);

        WriteRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt);
        return CreatedAtAction(nameof(Register), result.Response);
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

        AuthTokenIssueResult result;
        try
        {
            result = await _authService.RefreshAsync(refreshToken, cancellationToken)
                ?? throw new UnauthorizedException("Session expired. Please log in again.");
        }
        catch (UnauthorizedException)
        {
            DeleteRefreshCookie();
            throw;
        }

        WriteRefreshCookie(result.RefreshToken, result.RefreshTokenExpiresAt, result.Response.Role == UserRole.Admin);
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

    private void WriteRefreshCookie(string token, DateTime expiresAt, bool sessionOnly = false)
    {
        var options = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict
        };

        if (!sessionOnly)
        {
            options.Expires = new DateTimeOffset(expiresAt);
        }

        Response.Cookies.Append(GetRefreshCookieName(), token, options);
    }

    private void DeleteRefreshCookie()
    {
        Response.Cookies.Delete(GetRefreshCookieName());
    }
}
