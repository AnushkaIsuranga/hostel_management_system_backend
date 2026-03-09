using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

public sealed class HostelImageRepository : IHostelImageRepository
{
    private const int MaxImagesPerHostel = 8;

    private readonly ApplicationDbContext _context;

    public HostelImageRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public Task<List<HostelImage>> GetImagesByHostelIdAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        return _context.HostelImages
            .AsNoTracking()
            .Where(x => x.HostelId == hostelId)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<HostelImage?> GetImageByIdAsync(Guid imageId, CancellationToken cancellationToken)
    {
        return _context.HostelImages
            .Include(x => x.Hostel)
            .FirstOrDefaultAsync(x => x.Id == imageId, cancellationToken);
    }

    public async Task<HostelImage> AddImageAsync(HostelImage image, CancellationToken cancellationToken)
    {
        var count = await _context.HostelImages
            .CountAsync(x => x.HostelId == image.HostelId, cancellationToken);

        if (count >= MaxImagesPerHostel)
        {
            throw new BadRequestException($"Maximum {MaxImagesPerHostel} images allowed per hostel");
        }

        _context.HostelImages.Add(image);
        await _context.SaveChangesAsync(cancellationToken);

        return image;
    }

    public async Task<bool> DeleteImageAsync(HostelImage image, CancellationToken cancellationToken)
    {
        image.IsDeleted = true;
        image.DeletedAt = DateTime.UtcNow;
        image.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<bool> UpdateImageOrderAsync(HostelImage image, int order, CancellationToken cancellationToken)
    {
        image.DisplayOrder = order;
        image.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<Guid?> GetHostelOwnerIdAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        return await _context.Hostels
            .Where(h => h.Id == hostelId)
            .Select(h => (Guid?)h.OwnerId)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
