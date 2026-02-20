using Isopoh.Cryptography.Argon2;
using Microsoft.EntityFrameworkCore;

public interface IAuthService
{
    Task<AuthTokenIssueResult?> LoginAsync(LoginRequestDto dto, CancellationToken cancellationToken);
    Task<AuthTokenIssueResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken);
    Task LogoutAsync(string refreshToken, CancellationToken cancellationToken);
}

public sealed class AuthService : IAuthService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly JwtService _jwtService;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext dbContext, JwtService jwtService, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _jwtService = jwtService;
        _configuration = configuration;
    }

    public async Task<AuthTokenIssueResult?> LoginAsync(LoginRequestDto dto, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .FirstOrDefaultAsync(x => x.Email == dto.Email, cancellationToken);

        if (user is null)
        {
            return null;
        }

        if (!Argon2.Verify(user.PasswordHash, dto.Password))
        {
            return null;
        }

        user.LastActivityAt = DateTime.UtcNow;

        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshTokenValue = _jwtService.GenerateRefreshToken();
        var refreshExpiresAt = DateTime.UtcNow.Add(GetRefreshLifetime(user.Role, dto.RememberMe));

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = refreshExpiresAt,
            RememberMe = dto.RememberMe,
            Revoked = false,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.RefreshTokens.Add(refreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AuthTokenIssueResult(
            new AuthTokensResponseDto(
                accessToken.Token,
                accessToken.ExpiresAt,
                user.Id,
                user.Email,
                user.Role
            ),
            refreshTokenValue,
            refreshExpiresAt
        );
    }

    public async Task<AuthTokenIssueResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var tokenEntity = await _dbContext.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Token == refreshToken, cancellationToken);

        if (tokenEntity is null || tokenEntity.Revoked || tokenEntity.ExpiresAt <= DateTime.UtcNow)
        {
            return null;
        }

        if (tokenEntity.User.Role == UserRole.Admin)
        {
            var idleTimeoutMinutes = GetIntOrDefault(_configuration["AuthSettings:AdminIdleTimeoutMinutes"], 30);
            var idleTime = DateTime.UtcNow - tokenEntity.User.LastActivityAt;
            if (idleTime > TimeSpan.FromMinutes(idleTimeoutMinutes))
            {
                tokenEntity.Revoked = true;
                await _dbContext.SaveChangesAsync(cancellationToken);
                return null;
            }
        }

        tokenEntity.Revoked = true;

        var newRefreshTokenValue = _jwtService.GenerateRefreshToken();
        var newRefreshExpiresAt = DateTime.UtcNow.Add(GetRefreshLifetime(tokenEntity.User.Role, tokenEntity.RememberMe));

        var newTokenEntity = new RefreshToken
        {
            UserId = tokenEntity.UserId,
            Token = newRefreshTokenValue,
            ExpiresAt = newRefreshExpiresAt,
            RememberMe = tokenEntity.RememberMe,
            Revoked = false,
            CreatedAt = DateTime.UtcNow
        };

        var accessToken = _jwtService.GenerateAccessToken(tokenEntity.User);

        _dbContext.RefreshTokens.Add(newTokenEntity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AuthTokenIssueResult(
            new AuthTokensResponseDto(
                accessToken.Token,
                accessToken.ExpiresAt,
                tokenEntity.User.Id,
                tokenEntity.User.Email,
                tokenEntity.User.Role
            ),
            newRefreshTokenValue,
            newRefreshExpiresAt
        );
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken)
    {
        var tokenEntity = await _dbContext.RefreshTokens
            .FirstOrDefaultAsync(x => x.Token == refreshToken && !x.Revoked, cancellationToken);

        if (tokenEntity is null)
        {
            return;
        }

        tokenEntity.Revoked = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private TimeSpan GetRefreshLifetime(UserRole role, bool rememberMe)
    {
        if (role == UserRole.Admin)
        {
            var adminHours = GetIntOrDefault(_configuration["AuthSettings:AdminRefreshExpiryHours"], 12);
            return TimeSpan.FromHours(adminHours);
        }

        var userDays = rememberMe
            ? GetIntOrDefault(_configuration["AuthSettings:UserRefreshExpiryRememberDays"], 30)
            : GetIntOrDefault(_configuration["AuthSettings:UserRefreshExpiryDays"], 1);

        return TimeSpan.FromDays(userDays);
    }

    private static int GetIntOrDefault(string? value, int fallback)
    {
        return int.TryParse(value, out var parsed) ? parsed : fallback;
    }
}

public sealed record AuthTokenIssueResult(
    AuthTokensResponseDto Response,
    string RefreshToken,
    DateTime RefreshTokenExpiresAt
);
