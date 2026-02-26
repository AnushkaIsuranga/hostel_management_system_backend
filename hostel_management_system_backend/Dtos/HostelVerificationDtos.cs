public sealed record HostelVerificationRequestReadDto(
    Guid Id,
    Guid HostelId,
    Guid RequestedByUserId,
    HostelVerificationStatus Status,
    string? AdminNotes,
    Guid? ReviewedByAdminId,
    DateTime? ReviewedAt,
    DateTime CreatedAt
);

public sealed record CreateVerificationRequestDto(
    Guid HostelId
);

public sealed record ReviewVerificationRequestDto(
    string? AdminNotes
);
