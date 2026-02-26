public sealed record HostelSubscriptionReadDto(
    Guid Id,
    Guid HostelId,
    DateTime StartDate,
    DateTime ExpiryDate,
    bool IsActive,
    DateTime? LastReminderSentAt,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record UpsertHostelSubscriptionDto(
    DateTime StartDate,
    DateTime ExpiryDate
);
