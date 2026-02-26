using Microsoft.Extensions.Logging;

public interface IEmailService
{
    Task SendSubscriptionExpiredEmailAsync(Guid ownerId, CancellationToken cancellationToken);
    Task SendSubscriptionExpiringSoonEmailAsync(Guid ownerId, DateTime expiryDate, CancellationToken cancellationToken);
}

public sealed class EmailService : IEmailService
{
    private readonly IHostelSubscriptionRepository _subscriptionRepository;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IHostelSubscriptionRepository subscriptionRepository, ILogger<EmailService> logger)
    {
        _subscriptionRepository = subscriptionRepository;
        _logger = logger;
    }

    public async Task SendSubscriptionExpiredEmailAsync(Guid ownerId, CancellationToken cancellationToken)
    {
        var email = await _subscriptionRepository.GetUserEmailByIdAsync(ownerId, cancellationToken);
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        _logger.LogInformation(
            "Subscription expired email queued to {Email}. Subject: {Subject}. Body: {Body}",
            email,
            "Hostel verification expired",
            "Your hostel subscription expired. Renew to remain verified.");
    }

    public async Task SendSubscriptionExpiringSoonEmailAsync(Guid ownerId, DateTime expiryDate, CancellationToken cancellationToken)
    {
        var email = await _subscriptionRepository.GetUserEmailByIdAsync(ownerId, cancellationToken);
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        _logger.LogInformation(
            "Subscription reminder email queued to {Email}. Subject: {Subject}. Body: {Body}",
            email,
            "Hostel subscription expiring soon",
            $"Your hostel subscription will expire on {expiryDate:yyyy-MM-dd}. Renew to remain verified.");
    }
}
