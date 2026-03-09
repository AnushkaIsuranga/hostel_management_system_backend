using System.Text.Json;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

public interface IStudentPreferencesService
{
    Task<StudentPreferenceReadDto> GetMineAsync(Guid userId, CancellationToken cancellationToken);
    Task<StudentPreferenceReadDto> UpsertMineAsync(Guid userId, StudentPreferenceUpsertDto dto, CancellationToken cancellationToken);
}

public sealed class StudentPreferencesService : IStudentPreferencesService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly string[] ValidPriorityKeys = ["price", "distance", "rating"];

    private readonly ApplicationDbContext _db;

    public StudentPreferencesService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<StudentPreferenceReadDto> GetMineAsync(Guid userId, CancellationToken cancellationToken)
    {
        var preference = await _db.Set<StudentPreference>()
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

        if (preference is null)
            throw new NotFoundException("Student preferences not found.");

        return ToReadDto(preference);
    }

    public async Task<StudentPreferenceReadDto> UpsertMineAsync(Guid userId, StudentPreferenceUpsertDto dto, CancellationToken cancellationToken)
    {
        await ValidateInputAsync(dto, cancellationToken);

        var selectedAmenities = NormalizeAmenities(dto.SelectedAmenities);
        var priorityOrder = NormalizePriorityOrder(dto.PriorityOrder);
        var weights = ResolveWeights(dto.Weights, priorityOrder);

        var preference = await _db.Set<StudentPreference>()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);

        if (preference is null)
        {
            preference = new StudentPreference
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            };

            await _db.Set<StudentPreference>().AddAsync(preference, cancellationToken);
        }

        preference.UniversityId = dto.UniversityId;
        preference.MinBudget = dto.MinBudget;
        preference.MaxBudget = dto.MaxBudget;
        preference.RequiredCapacity = dto.RequiredCapacity;
        preference.SelectedAmenitiesJson = JsonSerializer.Serialize(selectedAmenities, JsonOptions);
        preference.PriorityOrderJson = JsonSerializer.Serialize(priorityOrder, JsonOptions);
        preference.PriceWeight = weights.price;
        preference.DistanceWeight = weights.distance;
        preference.RatingWeight = weights.rating;
        preference.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return ToReadDto(preference);
    }

    private async Task ValidateInputAsync(StudentPreferenceUpsertDto dto, CancellationToken cancellationToken)
    {
        if (dto.UniversityId == Guid.Empty)
            throw new BadRequestException("UniversityId is required.");

        if (dto.MinBudget.HasValue && dto.MinBudget.Value < 0)
            throw new BadRequestException("MinBudget cannot be negative.");

        if (dto.MaxBudget.HasValue && dto.MaxBudget.Value < 0)
            throw new BadRequestException("MaxBudget cannot be negative.");

        if (dto.MinBudget.HasValue && dto.MaxBudget.HasValue && dto.MinBudget.Value > dto.MaxBudget.Value)
            throw new BadRequestException("MinBudget cannot be greater than MaxBudget.");

        if (dto.RequiredCapacity.HasValue && dto.RequiredCapacity.Value <= 0)
            throw new BadRequestException("RequiredCapacity must be greater than zero.");

        var universityExists = await _db.Universities
            .AsNoTracking()
            .AnyAsync(x => x.Id == dto.UniversityId, cancellationToken);

        if (!universityExists)
            throw new NotFoundException("University not found.");

        if (dto.SelectedAmenities is { Count: > 0 })
        {
            var normalized = NormalizeAmenities(dto.SelectedAmenities);
            var existingCount = await _db.Amenities
                .AsNoTracking()
                .CountAsync(a => normalized.Contains(a.Name), cancellationToken);

            if (existingCount != normalized.Count)
                throw new BadRequestException("One or more selected amenities are invalid.");
        }
    }

    private static List<string> NormalizeAmenities(List<string>? selectedAmenities)
    {
        if (selectedAmenities is null || selectedAmenities.Count == 0)
            return [];

        return selectedAmenities
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> NormalizePriorityOrder(List<string>? priorityOrder)
    {
        if (priorityOrder is null || priorityOrder.Count == 0)
            return ["price", "distance", "rating"];

        var normalized = priorityOrder
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim().ToLowerInvariant())
            .Distinct()
            .ToList();

        if (normalized.Count != ValidPriorityKeys.Length ||
            normalized.Except(ValidPriorityKeys, StringComparer.Ordinal).Any())
        {
            throw new BadRequestException("PriorityOrder must contain exactly: price, distance, rating.");
        }

        return normalized;
    }

    private static (double price, double distance, double rating) ResolveWeights(StudentPreferenceWeightsDto? input, List<string> priorityOrder)
    {
        if (input is null)
        {
            var generated = new Dictionary<string, double>(StringComparer.Ordinal)
            {
                [priorityOrder[0]] = 0.5,
                [priorityOrder[1]] = 0.3,
                [priorityOrder[2]] = 0.2
            };

            return (generated["price"], generated["distance"], generated["rating"]);
        }

        if (input.Price < 0 || input.Distance < 0 || input.Rating < 0)
            throw new BadRequestException("Weights cannot be negative.");

        var sum = input.Price + input.Distance + input.Rating;
        if (sum <= 0)
            throw new BadRequestException("At least one weight must be greater than zero.");

        return (input.Price / sum, input.Distance / sum, input.Rating / sum);
    }

    private static StudentPreferenceReadDto ToReadDto(StudentPreference preference)
    {
        var selectedAmenities = DeserializeStringList(preference.SelectedAmenitiesJson);
        var priorityOrder = DeserializeStringList(preference.PriorityOrderJson);

        if (priorityOrder.Count == 0)
            priorityOrder = ["price", "distance", "rating"];

        return new StudentPreferenceReadDto(
            preference.UserId,
            preference.UniversityId,
            preference.MinBudget,
            preference.MaxBudget,
            preference.RequiredCapacity,
            selectedAmenities,
            priorityOrder,
            new StudentPreferenceWeightsDto(preference.PriceWeight, preference.DistanceWeight, preference.RatingWeight),
            preference.CreatedAt,
            preference.UpdatedAt);
    }

    private static List<string> DeserializeStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
