public sealed record HostelImageReadDto(
    Guid Id,
    Guid HostelId,
    string FileName,
    string ContentType,
    long FileSize,
    string ImageUrl,
    int DisplayOrder,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record UpdateHostelImageOrderDto(
    int DisplayOrder
);
