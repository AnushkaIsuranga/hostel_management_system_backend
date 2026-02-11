public sealed record InteractionEventReadDto(
    Guid Id,
    Guid? UserId,
    Guid? HostelId,
    InteractionType EventType,
    string? EventData,
    string SessionId,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record InteractionEventCreateDto(
    Guid? UserId,
    Guid? HostelId,
    InteractionType EventType,
    string? EventData,
    string SessionId
);

public sealed record InteractionEventUpdateDto(
    Guid? UserId,
    Guid? HostelId,
    InteractionType EventType,
    string? EventData,
    string SessionId
);
