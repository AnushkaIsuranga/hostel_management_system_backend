public sealed record AmenityReadDto(
    Guid Id,
    string Name,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record AmenityCreateDto(
    string Name
);

public sealed record AmenityUpdateDto(
    string Name
);
