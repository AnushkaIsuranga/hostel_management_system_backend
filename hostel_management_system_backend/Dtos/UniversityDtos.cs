public sealed record UniversityReadDto(
    Guid Id,
    string Name,
    double Latitude,
    double Longitude,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record UniversityCreateDto(
    string Name,
    double Latitude,
    double Longitude
);

public sealed record UniversityUpdateDto(
    string Name,
    double Latitude,
    double Longitude
);
