public sealed record HostelReadDto(
    Guid Id,
    string Name,
    string Description,
    string City,
    string Address,
    decimal MinPrice,
    decimal MaxPrice,
    string GenderPolicy,
    double Latitude,
    double Longitude,
    HostelStatus Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record HostelCreateDto(
    string Name,
    string Description,
    string City,
    string Address,
    decimal MinPrice,
    decimal MaxPrice,
    string GenderPolicy,
    double Latitude,
    double Longitude,
    HostelStatus Status
);

public sealed record HostelUpdateDto(
    string Name,
    string Description,
    string City,
    string Address,
    decimal MinPrice,
    decimal MaxPrice,
    string GenderPolicy,
    double Latitude,
    double Longitude,
    HostelStatus Status
);
