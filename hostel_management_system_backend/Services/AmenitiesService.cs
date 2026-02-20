using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

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
        var entity = _mapper.Map<Amenity>(dto);
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        await _repo.AddAsync(entity, cancellationToken);
        try
        {
            await _repo.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new ConflictException("An amenity with the same name already exists.", "amenity_name_conflict", ex);
        }

        return _mapper.Map<AmenityReadDto>(entity);
    }

    public async Task<AmenityReadDto?> UpdateAsync(Guid id, AmenityUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Amenity not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<AmenityReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Amenity not found.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
