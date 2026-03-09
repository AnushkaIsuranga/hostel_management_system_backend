using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Http;

public interface IHostelImagesService
{
    Task<List<HostelImageReadDto>> GetImagesByHostelIdAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<HostelImageReadDto> AddImageAsync(Guid hostelId, IFormFile file, int? displayOrder, Guid userId, bool isAdmin, CancellationToken cancellationToken);
    Task DeleteImageAsync(Guid imageId, Guid userId, bool isAdmin, CancellationToken cancellationToken);
    Task UpdateImageOrderAsync(Guid imageId, int order, Guid userId, bool isAdmin, CancellationToken cancellationToken);
}

public sealed class HostelImagesService : IHostelImagesService
{
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;

    private readonly IHostelImageRepository _repository;
    private readonly IImageStorageService _storageService;
    private readonly IMapper _mapper;

    public HostelImagesService(IHostelImageRepository repository, IImageStorageService storageService, IMapper mapper)
    {
        _repository = repository;
        _storageService = storageService;
        _mapper = mapper;
    }

    public async Task<List<HostelImageReadDto>> GetImagesByHostelIdAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        var images = await _repository.GetImagesByHostelIdAsync(hostelId, cancellationToken);
        return _mapper.Map<List<HostelImageReadDto>>(images);
    }

    public async Task<HostelImageReadDto> AddImageAsync(Guid hostelId, IFormFile file, int? displayOrder, Guid userId, bool isAdmin, CancellationToken cancellationToken)
    {
        if (file is null || file.Length <= 0)
        {
            throw new BadRequestException("Image file is required.");
        }

        if (file.Length > MaxImageSizeBytes)
        {
            throw new BadRequestException("Image too large. Maximum allowed size is 5MB.");
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            throw new BadRequestException("Invalid image type.");
        }

        var ownerId = await _repository.GetHostelOwnerIdAsync(hostelId, cancellationToken);
        if (!ownerId.HasValue)
        {
            throw new NotFoundException("Hostel not found.");
        }

        if (!isAdmin && ownerId.Value != userId)
        {
            throw new ForbiddenException("You are not allowed to upload images for this hostel.");
        }

        var storedImage = await _storageService.UploadImageAsync(file, hostelId, cancellationToken);

        try
        {
            var image = new HostelImage
            {
                HostelId = hostelId,
                FileName = storedImage.StoredFileName,
                ContentType = storedImage.ContentType,
                FileSize = storedImage.FileSize,
                ImageUrl = storedImage.ImageUrl,
                DisplayOrder = displayOrder ?? 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = null,
                IsDeleted = false
            };

            var created = await _repository.AddImageAsync(image, cancellationToken);
            return _mapper.Map<HostelImageReadDto>(created);
        }
        catch
        {
            await _storageService.DeleteImageAsync(storedImage.ImageUrl, cancellationToken);
            throw;
        }
    }

    public async Task DeleteImageAsync(Guid imageId, Guid userId, bool isAdmin, CancellationToken cancellationToken)
    {
        var image = await _repository.GetImageByIdAsync(imageId, cancellationToken);
        if (image is null)
        {
            throw new NotFoundException("Image not found.");
        }

        if (!isAdmin && image.Hostel.OwnerId != userId)
        {
            throw new ForbiddenException("You are not allowed to delete this image.");
        }

        await _storageService.DeleteImageAsync(image.ImageUrl, cancellationToken);
        await _repository.DeleteImageAsync(image, cancellationToken);
    }

    public async Task UpdateImageOrderAsync(Guid imageId, int order, Guid userId, bool isAdmin, CancellationToken cancellationToken)
    {
        if (order < 0)
        {
            throw new BadRequestException("Display order must be greater than or equal to 0.");
        }

        var image = await _repository.GetImageByIdAsync(imageId, cancellationToken);
        if (image is null)
        {
            throw new NotFoundException("Image not found.");
        }

        if (!isAdmin && image.Hostel.OwnerId != userId)
        {
            throw new ForbiddenException("You are not allowed to reorder this image.");
        }

        await _repository.UpdateImageOrderAsync(image, order, cancellationToken);
    }
}
