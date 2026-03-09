public sealed record StudentPreferenceWeightsDto(
    double Price,
    double Distance,
    double Rating
);

public sealed record StudentPreferenceReadDto(
    Guid UserId,
    Guid UniversityId,
    decimal? MinBudget,
    decimal? MaxBudget,
    int? RequiredCapacity,
    List<string> SelectedAmenities,
    List<string> PriorityOrder,
    StudentPreferenceWeightsDto Weights,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record StudentPreferenceUpsertDto(
    Guid UniversityId,
    decimal? MinBudget,
    decimal? MaxBudget,
    int? RequiredCapacity,
    List<string>? SelectedAmenities,
    List<string>? PriorityOrder,
    StudentPreferenceWeightsDto? Weights
);
