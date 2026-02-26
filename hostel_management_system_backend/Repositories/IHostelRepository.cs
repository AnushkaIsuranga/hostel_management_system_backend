public interface IHostelRepository
{
    Task<List<Hostel>> GetAllWithImagesAsNoTrackingAsync(CancellationToken cancellationToken);
    Task<Hostel?> GetByIdWithImagesAsNoTrackingAsync(Guid id, CancellationToken cancellationToken);
    Task<Hostel?> GetByIdWithImagesForUpdateAsync(Guid id, CancellationToken cancellationToken);
    Task AddAsync(Hostel entity, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
