using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

public interface IAmenitiesService
{
    Task<List<AmenityReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<AmenityReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<AmenityReadDto> CreateAsync(AmenityCreateDto dto, CancellationToken cancellationToken);
    Task<AmenityReadDto?> UpdateAsync(Guid id, AmenityUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class AmenitiesService : IAmenitiesService
{
    private readonly ICrudRepository<Amenity> _repo;
    private readonly IMapper _mapper;

    public AmenitiesService(ICrudRepository<Amenity> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<AmenityReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var amenities = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<AmenityReadDto>>(amenities.OrderBy(x => x.Name));
    }

    public async Task<AmenityReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var amenity = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        if (amenity is null)
            throw new NotFoundException("Amenity not found.");

        return _mapper.Map<AmenityReadDto>(amenity);
    }

    public async Task<AmenityReadDto> CreateAsync(AmenityCreateDto dto, CancellationToken cancellationToken)
    {
        var names = SplitAmenityNames(dto.Name);
        if (names.Count == 0)
            throw new BadRequestException("Amenity name is required.");

        var existingAmenities = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        var existingNames = existingAmenities
            .Select(x => NormalizeName(x.Name))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        Amenity? firstCreated = null;
        foreach (var name in names)
        {
            var normalized = NormalizeName(name);
            if (existingNames.Contains(normalized))
                continue;

            var entity = new Amenity
            {
                Name = name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            };

            await _repo.AddAsync(entity, cancellationToken);
            firstCreated ??= entity;
            existingNames.Add(normalized);
        }

        if (firstCreated is null)
            throw new ConflictException("An amenity with the same name already exists.", "amenity_name_conflict");

        try
        {
            await _repo.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new ConflictException("An amenity with the same name already exists.", "amenity_name_conflict", ex);
        }

        return _mapper.Map<AmenityReadDto>(firstCreated);
    }

    public async Task<AmenityReadDto?> UpdateAsync(Guid id, AmenityUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Amenity not found.");

        var names = SplitAmenityNames(dto.Name);
        if (names.Count == 0)
            throw new BadRequestException("Amenity name is required.");

        var existingAmenities = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        var currentNormalizedName = NormalizeName(entity.Name);

        var primaryName = names[0];
        var primaryNormalized = NormalizeName(primaryName);
        var primaryAlreadyExistsOnAnother = existingAmenities.Any(x =>
            x.Id != entity.Id &&
            string.Equals(NormalizeName(x.Name), primaryNormalized, StringComparison.OrdinalIgnoreCase));

        if (primaryAlreadyExistsOnAnother)
            throw new ConflictException("An amenity with the same name already exists.", "amenity_name_conflict");

        entity.Name = primaryName;
        entity.UpdatedAt = DateTime.UtcNow;

        var existingNames = existingAmenities
            .Where(x => x.Id != entity.Id)
            .Select(x => NormalizeName(x.Name))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        existingNames.Add(primaryNormalized);
        existingNames.Add(currentNormalizedName);

        foreach (var extraName in names.Skip(1))
        {
            var normalized = NormalizeName(extraName);
            if (existingNames.Contains(normalized))
                continue;

            await _repo.AddAsync(new Amenity
            {
                Name = extraName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            }, cancellationToken);

            existingNames.Add(normalized);
        }

        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<AmenityReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Amenity not found.");

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static List<string> SplitAmenityNames(string rawName)
    {
        if (string.IsNullOrWhiteSpace(rawName))
            return new List<string>();

        return rawName
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string NormalizeName(string value)
    {
        return value.Trim().ToLower(CultureInfo.InvariantCulture);
    }
}
