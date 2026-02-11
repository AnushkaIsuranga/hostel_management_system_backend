public sealed record HostelListingReadDto(
    Guid Id,
    Guid HostelId,
    Guid OwnerUserId,
    ListingStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record HostelListingCreateDto(
    Guid HostelId,
    Guid OwnerUserId,
    ListingStatus Status
);

public sealed record HostelListingUpdateDto(
    ListingStatus Status
);
