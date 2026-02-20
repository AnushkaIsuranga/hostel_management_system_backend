using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

public interface IHostelsService
{
    Task<List<HostelReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<HostelReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<HostelReadDto> CreateAsync(HostelCreateDto dto, CancellationToken cancellationToken);
    Task<HostelReadDto?> UpdateAsync(Guid id, HostelUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class HostelsService : IHostelsService
{
    private readonly ICrudRepository<Hostel> _repo;
    private readonly IMapper _mapper;

    public HostelsService(ICrudRepository<Hostel> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<HostelReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var hostels = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<HostelReadDto>>(hostels);
    }

    public async Task<HostelReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var hostel = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        if (hostel is null)
            throw new NotFoundException("Hostel not found.");

        return _mapper.Map<HostelReadDto>(hostel);
    }

    public async Task<HostelReadDto> CreateAsync(HostelCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Hostel>(dto);
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
            throw new ConflictException("A hostel with the same unique fields already exists.", "hostel_conflict", ex);
        }

        return _mapper.Map<HostelReadDto>(entity);
    }

    public async Task<HostelReadDto?> UpdateAsync(Guid id, HostelUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Hostel not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<HostelReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Hostel not found.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
