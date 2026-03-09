using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

public interface IHostelAmenitiesService
{
    Task<List<HostelAmenityReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<HostelAmenityReadDto?> GetByKeyAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
    Task<(bool Created, HostelAmenityReadDto? Result)> CreateAsync(HostelAmenityCreateDto dto, CancellationToken cancellationToken);
    Task<List<HostelAmenityReadDto>> CreateByNamesAsync(HostelAmenityBulkCreateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
}

public sealed class HostelAmenitiesService : IHostelAmenitiesService
{
    private readonly IHostelAmenityRepository _repo;
    private readonly IMapper _mapper;
    private readonly ApplicationDbContext _db;

    public HostelAmenitiesService(IHostelAmenityRepository repo, IMapper mapper, ApplicationDbContext db)
    {
        _repo = repo;
        _mapper = mapper;
        _db = db;
    }

    public async Task<List<HostelAmenityReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var links = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<HostelAmenityReadDto>>(links);
    }

    public async Task<HostelAmenityReadDto?> GetByKeyAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
    {
        var link = await _repo.GetByKeyAsNoTrackingAsync(hostelId, amenityId, cancellationToken);
        return link is null ? null : _mapper.Map<HostelAmenityReadDto>(link);
    }

    public async Task<(bool Created, HostelAmenityReadDto? Result)> CreateAsync(HostelAmenityCreateDto dto, CancellationToken cancellationToken)
    {
        var exists = await _repo.ExistsAsync(dto.HostelId, dto.AmenityId, cancellationToken);
        if (exists)
            throw new ConflictException("Hostel amenity already exists.", "hostel_amenity_conflict");

        var entity = _mapper.Map<HostelAmenity>(dto);
        await _repo.AddAsync(entity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);
        return (true, _mapper.Map<HostelAmenityReadDto>(entity));
    }

    public async Task<List<HostelAmenityReadDto>> CreateByNamesAsync(HostelAmenityBulkCreateDto dto, CancellationToken cancellationToken)
    {
        if (dto.HostelId == Guid.Empty)
            throw new BadRequestException("HostelId is required.");

        var names = SplitAmenityNames(dto.AmenityNames);
        if (names.Count == 0)
            throw new BadRequestException("At least one amenity name is required.");

        var hostelExists = await _db.Hostels
            .AsNoTracking()
            .AnyAsync(h => h.Id == dto.HostelId, cancellationToken);

        if (!hostelExists)
            throw new NotFoundException("Hostel not found.");

        var normalizedToRaw = names
            .GroupBy(NormalizeName)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var normalizedNames = normalizedToRaw.Keys.ToList();

        var amenities = await _db.Amenities
            .Where(a => normalizedNames.Contains(NormalizeName(a.Name)))
            .ToListAsync(cancellationToken);

        var amenityByNormalized = amenities
            .GroupBy(a => NormalizeName(a.Name))
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var normalized in normalizedNames)
        {
            if (amenityByNormalized.ContainsKey(normalized))
                continue;

            var newAmenity = new Amenity
            {
                Name = normalizedToRaw[normalized],
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            };

            _db.Amenities.Add(newAmenity);
            amenityByNormalized[normalized] = newAmenity;
        }

        var amenityIds = amenityByNormalized.Values.Select(a => a.Id).ToList();
        var existingLinks = await _db.HostelAmenities
            .Where(ha => ha.HostelId == dto.HostelId && amenityIds.Contains(ha.AmenityId))
            .ToListAsync(cancellationToken);

        var existingAmenityIds = existingLinks
            .Select(l => l.AmenityId)
            .ToHashSet();

        var linksToReturn = new List<HostelAmenity>();
        linksToReturn.AddRange(existingLinks);

        foreach (var normalized in normalizedNames)
        {
            var amenity = amenityByNormalized[normalized];
            if (existingAmenityIds.Contains(amenity.Id))
                continue;

            var link = new HostelAmenity
            {
                HostelId = dto.HostelId,
                AmenityId = amenity.Id
            };

            await _repo.AddAsync(link, cancellationToken);
            linksToReturn.Add(link);
            existingAmenityIds.Add(amenity.Id);
        }

        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<List<HostelAmenityReadDto>>(linksToReturn);
    }

    public async Task<bool> DeleteAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByKeyForDeleteAsync(hostelId, amenityId, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Hostel amenity link not found.");

        _repo.Remove(entity);
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static List<string> SplitAmenityNames(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return new List<string>();

        return raw
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(x => x.Trim())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string NormalizeName(string name)
    {
        return name.Trim().ToLower(CultureInfo.InvariantCulture);
    }
}
