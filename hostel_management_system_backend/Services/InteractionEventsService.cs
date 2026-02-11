using AutoMapper;

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
        return evt is null ? null : _mapper.Map<InteractionEventReadDto>(evt);
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
            return null;

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<InteractionEventReadDto>(entity);
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
