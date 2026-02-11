using AutoMapper;

public interface IHostelListingsService
{
    Task<List<HostelListingReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<HostelListingReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<HostelListingReadDto> CreateAsync(HostelListingCreateDto dto, CancellationToken cancellationToken);
    Task<HostelListingReadDto?> UpdateAsync(Guid id, HostelListingUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class HostelListingsService : IHostelListingsService
{
    private readonly ICrudRepository<HostelListing> _repo;
    private readonly IMapper _mapper;

    public HostelListingsService(ICrudRepository<HostelListing> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<HostelListingReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var listings = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<HostelListingReadDto>>(listings);
    }

    public async Task<HostelListingReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var listing = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        return listing is null ? null : _mapper.Map<HostelListingReadDto>(listing);
    }

    public async Task<HostelListingReadDto> CreateAsync(HostelListingCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<HostelListing>(dto);
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        await _repo.AddAsync(entity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<HostelListingReadDto>(entity);
    }

    public async Task<HostelListingReadDto?> UpdateAsync(Guid id, HostelListingUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            return null;

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<HostelListingReadDto>(entity);
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
