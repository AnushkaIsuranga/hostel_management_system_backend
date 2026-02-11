using AutoMapper;

public interface IRoomsService
{
    Task<List<RoomReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<RoomReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<RoomReadDto> CreateAsync(RoomCreateDto dto, CancellationToken cancellationToken);
    Task<RoomReadDto?> UpdateAsync(Guid id, RoomUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class RoomsService : IRoomsService
{
    private readonly ICrudRepository<Room> _repo;
    private readonly IMapper _mapper;

    public RoomsService(ICrudRepository<Room> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<RoomReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var rooms = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<RoomReadDto>>(rooms);
    }

    public async Task<RoomReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var room = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        return room is null ? null : _mapper.Map<RoomReadDto>(room);
    }

    public async Task<RoomReadDto> CreateAsync(RoomCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Room>(dto);
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        await _repo.AddAsync(entity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<RoomReadDto>(entity);
    }

    public async Task<RoomReadDto?> UpdateAsync(Guid id, RoomUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            return null;

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<RoomReadDto>(entity);
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
