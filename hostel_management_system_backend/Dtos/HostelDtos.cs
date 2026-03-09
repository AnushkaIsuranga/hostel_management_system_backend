public sealed record HostelReadDto(
    Guid Id,
    string Name,
    Guid OwnerId,
    string OwnerName,
    string OwnerEmail,
    string OwnerPhoneNumber,
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
    double Latitude,
    double Longitude,
    string GoogleMapsUrl,
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
    double? Latitude,
    double? Longitude,
    string? GoogleMapsUrl,
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
    double? Latitude,
    double? Longitude,
    string? GoogleMapsUrl,
    HostelStatus Status,
    List<string>? Images
);

public sealed record HostelSearchWeightsDto(
    double PriceWeight,
    double DistanceWeight,
    double RatingWeight
);

public sealed record HostelSearchRequestDto(
    decimal? MinBudget,
    decimal? MaxBudget,
    string? GenderPolicy,
    int? RequiredCapacity,
    Guid UniversityId,
    List<Guid>? AmenityIds,
    HostelSearchWeightsDto? Weights
);

public sealed record HostelSearchResultDto(
    HostelReadDto Hostel,
    double DistanceKm,
    double AverageRating,
    double Score
);
