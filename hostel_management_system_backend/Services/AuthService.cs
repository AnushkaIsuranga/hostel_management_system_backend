using Isopoh.Cryptography.Argon2;
using hostel_management_system_backend.Exceptions;

public interface IAuthService
{
    Task<AuthTokenIssueResult?> LoginAsync(LoginRequestDto dto, CancellationToken cancellationToken);
    Task<AuthTokenIssueResult?> RefreshAsync(string refreshToken, CancellationToken cancellationToken);
    Task LogoutAsync(string refreshToken, CancellationToken cancellationToken);
}

public sealed class AuthService : IAuthService
{
    private readonly IAuthRepository _repo;
    private readonly JwtService _jwtService;
    private readonly IConfiguration _configuration;

    public AuthService(IAuthRepository repo, JwtService jwtService, IConfiguration configuration)
    {
        _repo = repo;
        _jwtService = jwtService;
        _configuration = configuration;
    }

    public async Task<AuthTokenIssueResult?> LoginAsync(LoginRequestDto dto, CancellationToken cancellationToken)
    {
        var user = await _repo.GetUserByEmailForUpdateAsync(dto.Email, cancellationToken);

        if (user is null)
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        if (!Argon2.Verify(user.PasswordHash, dto.Password))
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        user.LastActivityAt = DateTime.UtcNow;

        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshTokenValue = _jwtService.GenerateRefreshToken();
        var refreshTokenHash = RefreshTokenHasher.Hash(refreshTokenValue);
        var refreshExpiresAt = DateTime.UtcNow.Add(GetRefreshLifetime(user.Role, dto.RememberMe));

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = refreshExpiresAt,
            RememberMe = dto.RememberMe,
            Revoked = false,
            CreatedAt = DateTime.UtcNow
        };

        await _repo.AddRefreshTokenAsync(refreshToken, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);

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
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedException("Refresh token is missing.");
        }

        var refreshTokenHash = RefreshTokenHasher.Hash(refreshToken);

        var tokenEntity = await _repo.GetRefreshTokenWithUserForUpdateAsync(refreshTokenHash, cancellationToken);

        if (tokenEntity is null || tokenEntity.Revoked || tokenEntity.ExpiresAt <= DateTime.UtcNow)
        {
            throw new UnauthorizedException("Session expired. Please log in again.");
        }

        if (tokenEntity.User.Role == UserRole.Admin)
        {
            var idleTimeoutMinutes = GetIntOrDefault(_configuration["AuthSettings:AdminIdleTimeoutMinutes"], 30);
            var idleTime = DateTime.UtcNow - tokenEntity.User.LastActivityAt;
            if (idleTime > TimeSpan.FromMinutes(idleTimeoutMinutes))
            {
                tokenEntity.Revoked = true;
                await _repo.SaveChangesAsync(cancellationToken);
                throw new UnauthorizedException("Session expired due to inactivity. Please log in again.");
            }
        }

        tokenEntity.Revoked = true;

        var newRefreshTokenValue = _jwtService.GenerateRefreshToken();
        var newRefreshTokenHash = RefreshTokenHasher.Hash(newRefreshTokenValue);
        var newRefreshExpiresAt = DateTime.UtcNow.Add(GetRefreshLifetime(tokenEntity.User.Role, tokenEntity.RememberMe));

        var newTokenEntity = new RefreshToken
        {
            UserId = tokenEntity.UserId,
            TokenHash = newRefreshTokenHash,
            ExpiresAt = newRefreshExpiresAt,
            RememberMe = tokenEntity.RememberMe,
            Revoked = false,
            CreatedAt = DateTime.UtcNow
        };

        var accessToken = _jwtService.GenerateAccessToken(tokenEntity.User);

        await _repo.AddRefreshTokenAsync(newTokenEntity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);

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
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var refreshTokenHash = RefreshTokenHasher.Hash(refreshToken);

        var tokenEntity = await _repo.GetActiveRefreshTokenForUpdateAsync(refreshTokenHash, cancellationToken);

        if (tokenEntity is null)
        {
            return;
        }

        tokenEntity.Revoked = true;
        await _repo.SaveChangesAsync(cancellationToken);
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
