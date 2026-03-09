using AutoMapper;
using hostel_management_system_backend.Exceptions;

public interface IInteractionEventsService
{
    Task<List<InteractionEventReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<InteractionEventReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<InteractionEventReadDto> CreateAsync(InteractionEventCreateDto dto, CancellationToken cancellationToken);
    Task<InteractionEventReadDto?> UpdateAsync(Guid id, InteractionEventUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class InteractionEventsService : IInteractionEventsService
{
    private readonly ICrudRepository<InteractionEvent> _repo;
    private readonly IMapper _mapper;

    public InteractionEventsService(ICrudRepository<InteractionEvent> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<InteractionEventReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var events = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<InteractionEventReadDto>>(events);
    }

    public async Task<InteractionEventReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var evt = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        if (evt is null)
            throw new NotFoundException("Interaction event not found.");

        return _mapper.Map<InteractionEventReadDto>(evt);
    }

    public async Task<InteractionEventReadDto> CreateAsync(InteractionEventCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<InteractionEvent>(dto);
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        await _repo.AddAsync(entity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<InteractionEventReadDto>(entity);
    }

    public async Task<InteractionEventReadDto?> UpdateAsync(Guid id, InteractionEventUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Interaction event not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<InteractionEventReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Interaction event not found.");

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
