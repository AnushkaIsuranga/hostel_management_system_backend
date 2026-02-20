public sealed record LoginRequestDto(
    string Email,
    string Password,
    bool RememberMe = false
);

public sealed record AuthTokensResponseDto(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    Guid UserId,
    string Email,
    UserRole Role
);
