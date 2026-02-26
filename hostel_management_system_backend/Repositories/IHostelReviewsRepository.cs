public interface IHostelReviewsRepository
{
    Task<bool> HostelExistsAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<bool> UserExistsAsync(Guid userId, CancellationToken cancellationToken);

    Task<List<HostelReview>> GetForHostelAsNoTrackingWithUserAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<int> CountForHostelAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<double> AverageRatingForHostelAsync(Guid hostelId, CancellationToken cancellationToken);

    Task AddAsync(HostelReview entity, CancellationToken cancellationToken);
    Task<HostelReview> GetByIdAsNoTrackingWithUserAsync(Guid reviewId, CancellationToken cancellationToken);

    Task<HostelReview?> GetForUpdateWithUserAsync(Guid hostelId, Guid reviewId, CancellationToken cancellationToken);
    Task<HostelReview?> GetForDeleteAsync(Guid hostelId, Guid reviewId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
