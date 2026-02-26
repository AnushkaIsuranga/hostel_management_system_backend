using AutoMapper;
using hostel_management_system_backend.Exceptions;

public interface ISubscriptionService
{
    Task<HostelSubscriptionReadDto> UpsertAsync(Guid hostelId, Guid actorUserId, bool isAdmin, UpsertHostelSubscriptionDto dto, CancellationToken cancellationToken);
    Task<HostelSubscriptionReadDto?> GetAsync(Guid hostelId, Guid actorUserId, bool isAdmin, CancellationToken cancellationToken);
    Task ProcessExpirationsAndRemindersAsync(CancellationToken cancellationToken);
}

public sealed class SubscriptionService : ISubscriptionService
{
    private readonly IHostelSubscriptionRepository _repo;
    private readonly IEmailService _emailService;
    private readonly IMapper _mapper;

    public SubscriptionService(IHostelSubscriptionRepository repo, IEmailService emailService, IMapper mapper)
    {
        _repo = repo;
        _emailService = emailService;
        _mapper = mapper;
    }

    public async Task<HostelSubscriptionReadDto> UpsertAsync(Guid hostelId, Guid actorUserId, bool isAdmin, UpsertHostelSubscriptionDto dto, CancellationToken cancellationToken)
    {
        if (dto.ExpiryDate <= dto.StartDate)
        {
            throw new BadRequestException("ExpiryDate must be greater than StartDate.", "invalid_subscription_dates");
        }

        if (!isAdmin)
        {
            var ownerHostel = await _repo.GetHostelForOwnerAsNoTrackingAsync(hostelId, actorUserId, cancellationToken);
            if (ownerHostel is null)
            {
                throw new ForbiddenException("You can only manage subscription for your own hostel.", "hostel_owner_required");
            }
        }

        var hostel = await _repo.GetHostelForUpdateAsync(hostelId, cancellationToken)
            ?? throw new NotFoundException("Hostel not found.");

        var subscription = await _repo.GetByHostelForUpdateAsync(hostelId, cancellationToken);
        if (subscription is null)
        {
            subscription = new HostelSubscription
            {
                HostelId = hostelId,
                StartDate = dto.StartDate,
                ExpiryDate = dto.ExpiryDate,
                IsActive = dto.ExpiryDate > DateTime.UtcNow,
                LastReminderSentAt = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            };

            await _repo.AddSubscriptionAsync(subscription, cancellationToken);
        }
        else
        {
            subscription.StartDate = dto.StartDate;
            subscription.ExpiryDate = dto.ExpiryDate;
            subscription.IsActive = dto.ExpiryDate > DateTime.UtcNow;
            subscription.UpdatedAt = DateTime.UtcNow;
            if (subscription.ExpiryDate > DateTime.UtcNow)
            {
                subscription.LastReminderSentAt = null;
            }
        }

        var nextStatus = VerificationEvaluator.EvaluateForSubscription(subscription);

        if (nextStatus == HostelVerificationStatus.Expired)
        {
            hostel.IsVerified = false;
            hostel.VerifiedAt = null;
        }
        else if (hostel.VerificationStatus == HostelVerificationStatus.Expired)
        {
            hostel.VerificationStatus = HostelVerificationStatus.Pending;
        }

        if (nextStatus == HostelVerificationStatus.Expired)
        {
            hostel.VerificationStatus = HostelVerificationStatus.Expired;
        }

        hostel.UpdatedAt = DateTime.UtcNow;

        await _repo.SaveChangesAsync(cancellationToken);

        return _mapper.Map<HostelSubscriptionReadDto>(subscription);
    }

    public async Task<HostelSubscriptionReadDto?> GetAsync(Guid hostelId, Guid actorUserId, bool isAdmin, CancellationToken cancellationToken)
    {
        if (!isAdmin)
        {
            var ownerHostel = await _repo.GetHostelForOwnerAsNoTrackingAsync(hostelId, actorUserId, cancellationToken);
            if (ownerHostel is null)
            {
                throw new ForbiddenException("You can only view subscription for your own hostel.", "hostel_owner_required");
            }
        }

        var subscription = await _repo.GetByHostelAsNoTrackingAsync(hostelId, cancellationToken);
        return subscription is null ? null : _mapper.Map<HostelSubscriptionReadDto>(subscription);
    }

    public async Task ProcessExpirationsAndRemindersAsync(CancellationToken cancellationToken)
    {
        var utcNow = DateTime.UtcNow;
        var reminderThresholdUtc = utcNow.AddDays(3);

        var expired = await _repo.GetExpiredActiveSubscriptionsWithHostelAsync(utcNow, cancellationToken);
        foreach (var subscription in expired)
        {
            subscription.IsActive = false;
            subscription.UpdatedAt = utcNow;

            subscription.Hostel.IsVerified = false;
            subscription.Hostel.VerifiedAt = null;
            subscription.Hostel.VerificationStatus = HostelVerificationStatus.Expired;
            subscription.Hostel.UpdatedAt = utcNow;

            await _emailService.SendSubscriptionExpiredEmailAsync(subscription.Hostel.OwnerId, cancellationToken);
        }

        var upcoming = await _repo.GetUpcomingActiveSubscriptionsWithHostelAsync(utcNow, reminderThresholdUtc, cancellationToken);
        foreach (var subscription in upcoming)
        {
            if (!VerificationEvaluator.ShouldSendReminder(subscription, utcNow, reminderThresholdUtc))
            {
                continue;
            }

            subscription.LastReminderSentAt = utcNow;
            subscription.UpdatedAt = utcNow;

            await _emailService.SendSubscriptionExpiringSoonEmailAsync(
                subscription.Hostel.OwnerId,
                subscription.ExpiryDate,
                cancellationToken);
        }

        if (expired.Count > 0 || upcoming.Count > 0)
        {
            await _repo.SaveChangesAsync(cancellationToken);
        }
    }
}
