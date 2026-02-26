using Microsoft.EntityFrameworkCore;

public sealed class AuthRepository : IAuthRepository
{
    private readonly ApplicationDbContext _db;

    public AuthRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetUserByEmailForUpdateAsync(string email, CancellationToken cancellationToken)
        => _db.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

    public Task<RefreshToken?> GetRefreshTokenWithUserForUpdateAsync(string tokenHash, CancellationToken cancellationToken)
        => _db.RefreshTokens
            .Include(x => x.User)
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

    public Task<RefreshToken?> GetActiveRefreshTokenForUpdateAsync(string tokenHash, CancellationToken cancellationToken)
        => _db.RefreshTokens
            .FirstOrDefaultAsync(x => x.TokenHash == tokenHash && !x.Revoked, cancellationToken);

    public Task AddRefreshTokenAsync(RefreshToken refreshToken, CancellationToken cancellationToken)
        => _db.RefreshTokens.AddAsync(refreshToken, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => _db.SaveChangesAsync(cancellationToken);
}
