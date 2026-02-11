public sealed record RoomReadDto(
    Guid Id,
    Guid HostelId,
    string RoomType,
    decimal Price,
    int Capacity,
    bool IsAvailable,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record RoomCreateDto(
    Guid HostelId,
    string RoomType,
    decimal Price,
    int Capacity,
    bool IsAvailable
);

public sealed record RoomUpdateDto(
    string RoomType,
    decimal Price,
    int Capacity,
    bool IsAvailable
);
