public interface IHostelSubscriptionRepository
{
    Task<Hostel?> GetHostelForOwnerAsNoTrackingAsync(Guid hostelId, Guid ownerId, CancellationToken cancellationToken);
    Task<Hostel?> GetHostelForUpdateAsync(Guid hostelId, CancellationToken cancellationToken);

    Task<HostelSubscription?> GetByHostelForUpdateAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<HostelSubscription?> GetByHostelAsNoTrackingAsync(Guid hostelId, CancellationToken cancellationToken);
    Task AddSubscriptionAsync(HostelSubscription subscription, CancellationToken cancellationToken);

    Task<List<HostelSubscription>> GetExpiredActiveSubscriptionsWithHostelAsync(DateTime utcNow, CancellationToken cancellationToken);
    Task<List<HostelSubscription>> GetUpcomingActiveSubscriptionsWithHostelAsync(DateTime utcNow, DateTime reminderThresholdUtc, CancellationToken cancellationToken);

    Task<string?> GetUserEmailByIdAsync(Guid userId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
