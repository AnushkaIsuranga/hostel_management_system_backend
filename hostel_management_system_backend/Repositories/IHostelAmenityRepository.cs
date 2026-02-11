public interface IHostelAmenityRepository
{
    Task<List<HostelAmenity>> GetAllAsNoTrackingAsync(CancellationToken cancellationToken);
    Task<HostelAmenity?> GetByKeyAsNoTrackingAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
    Task<bool> ExistsAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
    Task AddAsync(HostelAmenity entity, CancellationToken cancellationToken);
    Task<HostelAmenity?> GetByKeyForDeleteAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
    void Remove(HostelAmenity entity);
}
