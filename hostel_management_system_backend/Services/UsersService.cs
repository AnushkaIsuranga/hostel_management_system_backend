using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

public interface IUsersService
{
    Task<List<UserReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<UserReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UserReadDto> CreateAsync(UserCreateDto dto, CancellationToken cancellationToken);
    Task<UserReadDto?> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken);
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
        if (user is null)
            throw new NotFoundException("User not found.");

        return _mapper.Map<UserReadDto>(user);
    }

    public async Task<UserReadDto> CreateAsync(UserCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<User>(dto);
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
            throw new ConflictException("A user with the same email already exists.", "user_email_conflict", ex);
        }

        return _mapper.Map<UserReadDto>(entity);
    }

    public async Task<UserReadDto?> UpdateAsync(Guid id, UserUpdateDto dto, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("User not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<UserReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid requestingUserId, bool isAdmin, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetSingleForUpdateAsync(
            u => u.Id == id && u.Role != UserRole.Admin,
            cancellationToken);

        if (entity is null)
            throw new NotFoundException("User not found or cannot be deleted.");

        // Authorization: user can delete their own profile, admin can delete anyone
        if (!isAdmin && id != requestingUserId)
            throw new ForbiddenException("You can only delete your own profile.");

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
