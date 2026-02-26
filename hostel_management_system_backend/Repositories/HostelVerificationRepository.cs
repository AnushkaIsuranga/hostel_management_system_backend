using Microsoft.EntityFrameworkCore;

public sealed class HostelVerificationRepository : IHostelVerificationRepository
{
    private readonly ApplicationDbContext _db;

    public HostelVerificationRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public Task<Hostel?> GetHostelForOwnerAsNoTrackingAsync(Guid hostelId, Guid ownerId, CancellationToken cancellationToken)
        => _db.Hostels
            .AsNoTracking()
            .FirstOrDefaultAsync(h => h.Id == hostelId && h.OwnerId == ownerId, cancellationToken);

    public Task<Hostel?> GetHostelForUpdateAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.Hostels.FirstOrDefaultAsync(h => h.Id == hostelId, cancellationToken);

    public Task<HostelVerificationRequest?> GetPendingRequestForHostelAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelVerificationRequests
            .FirstOrDefaultAsync(v => v.HostelId == hostelId && v.Status == HostelVerificationStatus.Pending, cancellationToken);

    public Task AddVerificationRequestAsync(HostelVerificationRequest request, CancellationToken cancellationToken)
        => _db.HostelVerificationRequests.AddAsync(request, cancellationToken).AsTask();

    public Task<HostelVerificationRequest?> GetRequestForUpdateAsync(Guid requestId, CancellationToken cancellationToken)
        => _db.HostelVerificationRequests
            .FirstOrDefaultAsync(v => v.Id == requestId, cancellationToken);

    public Task<List<HostelVerificationRequest>> GetRequestsForHostelAsNoTrackingAsync(Guid hostelId, CancellationToken cancellationToken)
        => _db.HostelVerificationRequests
            .AsNoTracking()
            .Where(v => v.HostelId == hostelId)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken)
        => _db.SaveChangesAsync(cancellationToken);
}
