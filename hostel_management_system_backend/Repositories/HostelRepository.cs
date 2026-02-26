using Microsoft.EntityFrameworkCore;

public sealed class HostelRepository : IHostelRepository
{
    private readonly ApplicationDbContext _db;

    public HostelRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<List<Hostel>> GetAllWithImagesAsNoTrackingAsync(CancellationToken cancellationToken)
        => _db.Hostels
            .AsNoTracking()
            .Include(h => h.Images)
            .OrderByDescending(h => h.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<Hostel?> GetByIdWithImagesAsNoTrackingAsync(Guid id, CancellationToken cancellationToken)
        => _db.Hostels
            .AsNoTracking()
            .Include(h => h.Images)
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

    public Task<Hostel?> GetByIdWithImagesForUpdateAsync(Guid id, CancellationToken cancellationToken)
        => _db.Hostels
            .Include(h => h.Images)
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

    public Task AddAsync(Hostel entity, CancellationToken cancellationToken)
        => _db.Hostels.AddAsync(entity, cancellationToken).AsTask();

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => _db.SaveChangesAsync(cancellationToken);
}
