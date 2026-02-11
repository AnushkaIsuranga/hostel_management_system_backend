using AutoMapper;

public interface IUsersService
{
    Task<List<UserReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<UserReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UserReadDto> CreateAsync(UserCreateDto dto, CancellationToken cancellationToken);
    Task<UserReadDto?> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class UsersService : IUsersService
{
    private readonly ICrudRepository<User> _repo;
    private readonly IMapper _mapper;

    public UsersService(ICrudRepository<User> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<UserReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var users = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<UserReadDto>>(users);
    }

    public async Task<UserReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        return user is null ? null : _mapper.Map<UserReadDto>(user);
    }

    public async Task<UserReadDto> CreateAsync(UserCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<User>(dto);
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        await _repo.AddAsync(entity, cancellationToken);
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<UserReadDto>(entity);
    }

    public async Task<UserReadDto?> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            return null;

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<UserReadDto>(entity);
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
