public sealed record HostelAmenityReadDto(
    Guid HostelId,
    Guid AmenityId
);

public sealed record HostelAmenityCreateDto(
    Guid HostelId,
    Guid AmenityId
);
