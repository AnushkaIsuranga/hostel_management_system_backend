public interface IAuthRepository
{
    Task<User?> GetUserByEmailForUpdateAsync(string email, CancellationToken cancellationToken);
    Task<RefreshToken?> GetRefreshTokenWithUserForUpdateAsync(string tokenHash, CancellationToken cancellationToken);
    Task<RefreshToken?> GetActiveRefreshTokenForUpdateAsync(string tokenHash, CancellationToken cancellationToken);
    Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
