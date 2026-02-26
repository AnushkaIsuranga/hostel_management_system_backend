using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.IO;

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
    private const int MaxImagesPerHostel = 8;

    private readonly IHostelRepository _repo;
    private readonly IMapper _mapper;

    public HostelsService(IHostelRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<HostelReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var hostels = await _repo.GetAllWithImagesAsNoTrackingAsync(cancellationToken);
        return _mapper.Map<List<HostelReadDto>>(hostels);
    }

    public async Task<HostelReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var hostel = await _repo.GetByIdWithImagesAsNoTrackingAsync(id, cancellationToken);
        if (hostel is null)
            throw new NotFoundException("Hostel not found.");

        return _mapper.Map<HostelReadDto>(hostel);
    }

    public async Task<HostelReadDto> CreateAsync(HostelCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Hostel>(dto);
        entity.IsVerified = false;
        entity.VerifiedAt = null;
        entity.VerifiedByAdminId = null;
        entity.VerificationStatus = HostelVerificationStatus.None;
        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = null;
        entity.IsDeleted = false;

        if (dto.Images is { Count: > 0 })
        {
            var imageUrls = dto.Images.Where(i => !string.IsNullOrWhiteSpace(i)).ToList();
            if (imageUrls.Count > MaxImagesPerHostel)
            {
                throw new BadRequestException($"Maximum {MaxImagesPerHostel} images are allowed per hostel.");
            }

            var displayOrder = 0;
            foreach (var imageUrl in imageUrls)
            {
                entity.Images.Add(new HostelImage
                {
                    ImageUrl = imageUrl,
                    FileName = Path.GetFileName(new Uri(imageUrl, UriKind.RelativeOrAbsolute).IsAbsoluteUri
                        ? new Uri(imageUrl).AbsolutePath
                        : imageUrl),
                    ContentType = "application/octet-stream",
                    FileSize = 0,
                    DisplayOrder = displayOrder++,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = null,
                    IsDeleted = false
                });
            }
        }

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
        var entity = await _repo.GetByIdWithImagesForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Hostel not found.");

        _mapper.Map(dto, entity);

        if (dto.Images is not null)
        {
            var imageUrls = dto.Images.Where(i => !string.IsNullOrWhiteSpace(i)).ToList();
            if (imageUrls.Count > MaxImagesPerHostel)
            {
                throw new BadRequestException($"Maximum {MaxImagesPerHostel} images are allowed per hostel.");
            }

            foreach (var existing in entity.Images)
            {
                existing.IsDeleted = true;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            var displayOrder = 0;
            foreach (var imageUrl in imageUrls)
            {
                entity.Images.Add(new HostelImage
                {
                    ImageUrl = imageUrl,
                    FileName = Path.GetFileName(new Uri(imageUrl, UriKind.RelativeOrAbsolute).IsAbsoluteUri
                        ? new Uri(imageUrl).AbsolutePath
                        : imageUrl),
                    ContentType = "application/octet-stream",
                    FileSize = 0,
                    DisplayOrder = displayOrder++,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = null,
                    IsDeleted = false
                });
            }
        }

        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return _mapper.Map<HostelReadDto>(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetByIdWithImagesForUpdateAsync(id, cancellationToken);
        if (entity is null)
            throw new NotFoundException("Hostel not found.");

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }
}
