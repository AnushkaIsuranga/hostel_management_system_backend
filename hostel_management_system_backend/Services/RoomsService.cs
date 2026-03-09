using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

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
        if (room is null)
            throw new NotFoundException("Room not found.");

        return _mapper.Map<RoomReadDto>(room);
    }

    public async Task<RoomReadDto> CreateAsync(RoomCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Room>(dto);
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
            throw new ConflictException("A room with the same unique fields already exists.", "room_conflict", ex);
        }

        return _mapper.Map<RoomReadDto>(entity);
    }

    public async Task<RoomReadDto?> UpdateAsync(Guid id, RoomUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Room not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<RoomReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Room not found.");

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
