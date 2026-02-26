public interface IHostelVerificationRepository
{
    Task<Hostel?> GetHostelForOwnerAsNoTrackingAsync(Guid hostelId, Guid ownerId, CancellationToken cancellationToken);
    Task<Hostel?> GetHostelForUpdateAsync(Guid hostelId, CancellationToken cancellationToken);

    Task<HostelVerificationRequest?> GetPendingRequestForHostelAsync(Guid hostelId, CancellationToken cancellationToken);
    Task AddVerificationRequestAsync(HostelVerificationRequest request, CancellationToken cancellationToken);
    Task<HostelVerificationRequest?> GetRequestForUpdateAsync(Guid requestId, CancellationToken cancellationToken);
    Task<List<HostelVerificationRequest>> GetRequestsForHostelAsNoTrackingAsync(Guid hostelId, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
