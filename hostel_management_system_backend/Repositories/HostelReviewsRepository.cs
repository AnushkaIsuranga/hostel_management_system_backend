using Microsoft.EntityFrameworkCore;

public sealed class HostelReviewsRepository : IHostelReviewsRepository
{
    private readonly ApplicationDbContext _db;

    public HostelReviewsRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<bool> HostelExistsAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.Hostels.AnyAsync(h => h.Id == hostelId, cancellationToken);

    public Task<bool> UserExistsAsync(Guid userId, CancellationToken cancellationToken)
        => _db.Users.AnyAsync(u => u.Id == userId, cancellationToken);

    public Task<List<HostelReview>> GetForHostelAsNoTrackingWithUserAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelReviews
            .AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.HostelId == hostelId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<int> CountForHostelAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelReviews
            .AsNoTracking()
            .Where(r => r.HostelId == hostelId)
            .CountAsync(cancellationToken);

    public Task<double> AverageRatingForHostelAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelReviews
            .AsNoTracking()
            .Where(r => r.HostelId == hostelId)
            .AverageAsync(r => (double)r.Rating, cancellationToken);

    public Task AddAsync(HostelReview entity, CancellationToken cancellationToken)
        => _db.HostelReviews.AddAsync(entity, cancellationToken).AsTask();

    public Task<HostelReview> GetByIdAsNoTrackingWithUserAsync(Guid reviewId, CancellationToken cancellationToken)
        => _db.HostelReviews
            .AsNoTracking()
            .Include(r => r.User)
            .FirstAsync(r => r.Id == reviewId, cancellationToken);

    public Task<HostelReview?> GetForUpdateWithUserAsync(Guid hostelId, Guid reviewId, CancellationToken cancellationToken)
        => _db.HostelReviews
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.HostelId == hostelId, cancellationToken);

    public Task<HostelReview?> GetForDeleteAsync(Guid hostelId, Guid reviewId, CancellationToken cancellationToken)
        => _db.HostelReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.HostelId == hostelId, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => _db.SaveChangesAsync(cancellationToken);
}
