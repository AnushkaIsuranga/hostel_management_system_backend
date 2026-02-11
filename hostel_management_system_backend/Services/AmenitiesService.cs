using AutoMapper;

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
        return amenity is null ? null : _mapper.Map<AmenityReadDto>(amenity);
    }

    public async Task<AmenityReadDto> CreateAsync(AmenityCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Amenity>(dto);
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        await _repo.AddAsync(entity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<AmenityReadDto>(entity);
    }

    public async Task<AmenityReadDto?> UpdateAsync(Guid id, AmenityUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            return null;

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<AmenityReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            return false;

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
