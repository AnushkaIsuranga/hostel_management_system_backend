using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

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
        if (listing is null)
            throw new NotFoundException("Listing not found.");

        return _mapper.Map<HostelListingReadDto>(listing);
    }

    public async Task<HostelListingReadDto> CreateAsync(HostelListingCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<HostelListing>(dto);
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
            throw new ConflictException("A listing already exists for this hostel and owner.", "listing_conflict", ex);
        }

        return _mapper.Map<HostelListingReadDto>(entity);
    }

    public async Task<HostelListingReadDto?> UpdateAsync(Guid id, HostelListingUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Listing not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<HostelListingReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Listing not found.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
