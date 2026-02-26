using Microsoft.EntityFrameworkCore;

public sealed class HostelSubscriptionRepository : IHostelSubscriptionRepository
{
    private readonly ApplicationDbContext _db;

    public HostelSubscriptionRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<Hostel?> GetHostelForOwnerAsNoTrackingAsync(Guid hostelId, Guid ownerId, CancellationToken cancellationToken)
        => _db.Hostels
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == hostelId && h.OwnerId == ownerId, cancellationToken);

    public Task<Hostel?> GetHostelForUpdateAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.Hostels
            .FirstOrDefaultAsync(h => h.Id == hostelId, cancellationToken);

    public Task<HostelSubscription?> GetByHostelForUpdateAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelSubscriptions
            .FirstOrDefaultAsync(s => s.HostelId == hostelId, cancellationToken);

    public Task<HostelSubscription?> GetByHostelAsNoTrackingAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelSubscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.HostelId == hostelId, cancellationToken);

    public Task AddSubscriptionAsync(HostelSubscription subscription, CancellationToken cancellationToken)
        => _db.HostelSubscriptions.AddAsync(subscription, cancellationToken).AsTask();

    public Task<List<HostelSubscription>> GetExpiredActiveSubscriptionsWithHostelAsync(DateTime utcNow, CancellationToken cancellationToken)
        => _db.HostelSubscriptions
            .Include(s => s.Hostel)
            .Where(s => s.IsActive && s.ExpiryDate < utcNow)
            .ToListAsync(cancellationToken);

    public Task<List<HostelSubscription>> GetUpcomingActiveSubscriptionsWithHostelAsync(DateTime utcNow, DateTime reminderThresholdUtc, CancellationToken cancellationToken)
        => _db.HostelSubscriptions
            .Include(s => s.Hostel)
            .Where(s => s.IsActive && s.ExpiryDate >= utcNow && s.ExpiryDate <= reminderThresholdUtc)
            .ToListAsync(cancellationToken);

    public Task<string?> GetUserEmailByIdAsync(Guid userId, CancellationToken cancellationToken)
        => _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.Email)
            .FirstOrDefaultAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => _db.SaveChangesAsync(cancellationToken);
}
