public sealed record UserReadDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    UserRole Role,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public sealed record UserCreateDto(
    string FullName,
    string Email,
    string PhoneNumber,
    UserRole Role
);

public sealed record UserUpdateDto(
    string FullName,
    string PhoneNumber,
    UserRole Role
);
