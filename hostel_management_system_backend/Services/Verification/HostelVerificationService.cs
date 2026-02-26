using AutoMapper;
using hostel_management_system_backend.Exceptions;

public interface IHostelVerificationService
{
    Task<HostelVerificationRequestReadDto> RequestVerificationAsync(Guid hostelId, Guid ownerId, CancellationToken cancellationToken);
    Task<HostelVerificationRequestReadDto> ApproveVerificationAsync(Guid requestId, Guid adminId, string? adminNotes, CancellationToken cancellationToken);
    Task<HostelVerificationRequestReadDto> RejectVerificationAsync(Guid requestId, Guid adminId, string? adminNotes, CancellationToken cancellationToken);
    Task<List<HostelVerificationRequestReadDto>> GetForHostelAsync(Guid hostelId, Guid requesterId, bool isAdmin, CancellationToken cancellationToken);
}

public sealed class HostelVerificationService : IHostelVerificationService
{
    private readonly IHostelVerificationRepository _repo;
    private readonly IMapper _mapper;

    public HostelVerificationService(IHostelVerificationRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<HostelVerificationRequestReadDto> RequestVerificationAsync(Guid hostelId, Guid ownerId, CancellationToken cancellationToken)
    {
        var hostel = await _repo.GetHostelForOwnerAsNoTrackingAsync(hostelId, ownerId, cancellationToken);
        if (hostel is null)
        {
            throw new ForbiddenException("You can only request verification for your own hostel.", "hostel_owner_required");
        }

        var pending = await _repo.GetPendingRequestForHostelAsync(hostelId, cancellationToken);
        if (pending is not null)
        {
            throw new ConflictException("A pending verification request already exists.", "verification_pending_exists");
        }

        var request = new HostelVerificationRequest
        {
            HostelId = hostelId,
            RequestedByUserId = ownerId,
            Status = HostelVerificationStatus.Pending,
            AdminNotes = null,
            ReviewedByAdminId = null,
            ReviewedAt = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null,
            IsDeleted = false
        };

        await _repo.AddVerificationRequestAsync(request, cancellationToken);

        var hostelForUpdate = await _repo.GetHostelForUpdateAsync(hostelId, cancellationToken)
            ?? throw new NotFoundException("Hostel not found.");
        hostelForUpdate.VerificationStatus = HostelVerificationStatus.Pending;
        hostelForUpdate.UpdatedAt = DateTime.UtcNow;

        await _repo.SaveChangesAsync(cancellationToken);

        return _mapper.Map<HostelVerificationRequestReadDto>(request);
    }

    public async Task<HostelVerificationRequestReadDto> ApproveVerificationAsync(Guid requestId, Guid adminId, string? adminNotes, CancellationToken cancellationToken)
    {
        var request = await _repo.GetRequestForUpdateAsync(requestId, cancellationToken)
            ?? throw new NotFoundException("Verification request not found.");

        if (request.Status != HostelVerificationStatus.Pending)
        {
            throw new BadRequestException("Only pending requests can be approved.", "verification_request_not_pending");
        }

        request.Status = HostelVerificationStatus.Approved;
        request.AdminNotes = string.IsNullOrWhiteSpace(adminNotes) ? null : adminNotes.Trim();
        request.ReviewedByAdminId = adminId;
        request.ReviewedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        var hostel = await _repo.GetHostelForUpdateAsync(request.HostelId, cancellationToken)
            ?? throw new NotFoundException("Hostel not found.");

        hostel.IsVerified = true;
        hostel.VerifiedAt = DateTime.UtcNow;
        hostel.VerifiedByAdminId = adminId;
        hostel.VerificationStatus = HostelVerificationStatus.Approved;
        hostel.UpdatedAt = DateTime.UtcNow;

        await _repo.SaveChangesAsync(cancellationToken);

        return _mapper.Map<HostelVerificationRequestReadDto>(request);
    }

    public async Task<HostelVerificationRequestReadDto> RejectVerificationAsync(Guid requestId, Guid adminId, string? adminNotes, CancellationToken cancellationToken)
    {
        var request = await _repo.GetRequestForUpdateAsync(requestId, cancellationToken)
            ?? throw new NotFoundException("Verification request not found.");

        if (request.Status != HostelVerificationStatus.Pending)
        {
            throw new BadRequestException("Only pending requests can be rejected.", "verification_request_not_pending");
        }

        request.Status = HostelVerificationStatus.Rejected;
        request.AdminNotes = string.IsNullOrWhiteSpace(adminNotes) ? null : adminNotes.Trim();
        request.ReviewedByAdminId = adminId;
        request.ReviewedAt = DateTime.UtcNow;
        request.UpdatedAt = DateTime.UtcNow;

        var hostel = await _repo.GetHostelForUpdateAsync(request.HostelId, cancellationToken)
            ?? throw new NotFoundException("Hostel not found.");

        hostel.IsVerified = false;
        hostel.VerifiedAt = null;
        hostel.VerifiedByAdminId = adminId;
        hostel.VerificationStatus = HostelVerificationStatus.Rejected;
        hostel.UpdatedAt = DateTime.UtcNow;

        await _repo.SaveChangesAsync(cancellationToken);

        return _mapper.Map<HostelVerificationRequestReadDto>(request);
    }

    public async Task<List<HostelVerificationRequestReadDto>> GetForHostelAsync(Guid hostelId, Guid requesterId, bool isAdmin, CancellationToken cancellationToken)
    {
        if (!isAdmin)
        {
            var hostel = await _repo.GetHostelForOwnerAsNoTrackingAsync(hostelId, requesterId, cancellationToken);
            if (hostel is null)
            {
                throw new ForbiddenException("You can only view verification requests for your own hostel.", "hostel_owner_required");
            }
        }

        var requests = await _repo.GetRequestsForHostelAsNoTrackingAsync(hostelId, cancellationToken);
        return _mapper.Map<List<HostelVerificationRequestReadDto>>(requests);
    }
}
