public sealed record HostelReadDto(
    Guid Id,
    string Name,
    Guid OwnerId,
    bool IsVerified,
    DateTime? VerifiedAt,
    Guid? VerifiedByAdminId,
    HostelVerificationStatus VerificationStatus,
    string Description,
    string City,
    string Address,
    decimal MinPrice,
    decimal MaxPrice,
    string GenderPolicy,
    string LocationUrl,
    HostelStatus Status,
    List<string> Images,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record HostelCreateDto(
    string Name,
    Guid OwnerId,
    string Description,
    string City,
    string Address,
    decimal MinPrice,
    decimal MaxPrice,
    string GenderPolicy,
    string LocationUrl,
    HostelStatus Status,
    List<string>? Images
);

public sealed record HostelUpdateDto(
    string Name,
    Guid OwnerId,
    string Description,
    string City,
    string Address,
    decimal MinPrice,
    decimal MaxPrice,
    string GenderPolicy,
    string LocationUrl,
    HostelStatus Status,
    List<string>? Images
);
