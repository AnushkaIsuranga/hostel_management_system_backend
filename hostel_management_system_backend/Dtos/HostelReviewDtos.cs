public sealed record HostelReviewReadDto(
    Guid Id,
    Guid HostelId,
    Guid UserId,
    string UserFullName,
    int Rating,
    string? Comment,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record HostelReviewCreateDto(
    int Rating,
    string? Comment
);

public sealed record HostelReviewUpdateDto(
    int Rating,
    string? Comment
);

public sealed record HostelRatingSummaryDto(
    Guid HostelId,
    double AverageRating,
    int ReviewCount
);
