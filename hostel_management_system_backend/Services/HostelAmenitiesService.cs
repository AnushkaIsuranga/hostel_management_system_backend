using AutoMapper;
using hostel_management_system_backend.Exceptions;

public interface IHostelAmenitiesService
{
    Task<List<HostelAmenityReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<HostelAmenityReadDto?> GetByKeyAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
    Task<(bool Created, HostelAmenityReadDto? Result)> CreateAsync(HostelAmenityCreateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken);
}

public sealed class HostelAmenitiesService : IHostelAmenitiesService
{
    private readonly IHostelAmenityRepository _repo;
    private readonly IMapper _mapper;

    public HostelAmenitiesService(IHostelAmenityRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
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

    public async Task<bool> DeleteAsync(Guid hostelId, Guid amenityId, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByKeyForDeleteAsync(hostelId, amenityId, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Hostel amenity link not found.");

        _repo.Remove(entity);
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
