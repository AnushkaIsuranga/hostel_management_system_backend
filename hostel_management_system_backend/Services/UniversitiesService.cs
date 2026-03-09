using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

public interface IUniversitiesService
{
    Task<List<UniversityReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<UniversityReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<UniversityReadDto> CreateAsync(UniversityCreateDto dto, CancellationToken cancellationToken);
    Task<UniversityReadDto?> UpdateAsync(Guid id, UniversityUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class UniversitiesService : IUniversitiesService
{
    private readonly ICrudRepository<University> _repo;
    private readonly IMapper _mapper;

    public UniversitiesService(ICrudRepository<University> repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<UniversityReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var universities = await _repo.GetAllAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<UniversityReadDto>>(universities.OrderBy(x => x.Name));
    }

    public async Task<UniversityReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var university = await _repo.GetByIdAsNoTrackingAsync(id, cancellationToken);
        if (university is null)
            throw new NotFoundException("University not found.");

        return _mapper.Map<UniversityReadDto>(university);
    }

    public async Task<UniversityReadDto> CreateAsync(UniversityCreateDto dto, CancellationToken cancellationToken)
    {
        ValidateCoordinates(dto.Latitude, dto.Longitude);

        var entity = _mapper.Map<University>(dto);
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
            throw new ConflictException("A university with the same name already exists.", "university_name_conflict", ex);
        }

        return _mapper.Map<UniversityReadDto>(entity);
    }

    public async Task<UniversityReadDto?> UpdateAsync(Guid id, UniversityUpdateDto dto, CancellationToken cancellationToken)
    {
        ValidateCoordinates(dto.Latitude, dto.Longitude);

        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("University not found.");

        _mapper.Map(dto, entity);
        entity.UpdatedAt = DateTime.UtcNow;

        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<UniversityReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("University not found.");

        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static void ValidateCoordinates(double latitude, double longitude)
    {
        if (latitude < -90 || latitude > 90)
            throw new BadRequestException("Latitude must be between -90 and 90.");

        if (longitude < -180 || longitude > 180)
            throw new BadRequestException("Longitude must be between -180 and 180.");
    }
}
