using Microsoft.EntityFrameworkCore;

public sealed class HostelAmenityRepository : IHostelAmenityRepository
{
    private readonly ApplicationDbContext _db;

    public HostelAmenityRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<List<HostelAmenity>> GetAllAsNoTrackingAsync(CancellationToken cancellationToken)
        => _db.HostelAmenities.AsNoTracking().ToListAsync(cancellationToken);

    public Task<HostelAmenity?> GetByKeyAsNoTrackingAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
        => _db.HostelAmenities
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.HostelId == hostelId && x.AmenityId == amenityId, cancellationToken);

    public Task<bool> ExistsAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
        => _db.HostelAmenities.AnyAsync(x => x.HostelId == hostelId && x.AmenityId == amenityId, cancellationToken);

    public Task AddAsync(HostelAmenity entity, CancellationToken cancellationToken)
        => _db.HostelAmenities.AddAsync(entity, cancellationToken).AsTask();

    public Task<HostelAmenity?> GetByKeyForDeleteAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
        => _db.HostelAmenities.FirstOrDefaultAsync(x => x.HostelId == hostelId && x.AmenityId == amenityId, cancellationToken);

    public void Remove(HostelAmenity entity) => _db.HostelAmenities.Remove(entity);

    public Task SaveChangesAsync(CancellationToken cancellationToken) => _db.SaveChangesAsync(cancellationToken);
}
