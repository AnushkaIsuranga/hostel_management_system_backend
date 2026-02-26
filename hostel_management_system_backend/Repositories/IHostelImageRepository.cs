public interface IHostelImageRepository
{
    Task<List<HostelImage>> GetImagesByHostelIdAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<HostelImage?> GetImageByIdAsync(Guid imageId, CancellationToken cancellationToken);
    Task<HostelImage> AddImageAsync(HostelImage image, CancellationToken cancellationToken);
    Task<bool> DeleteImageAsync(HostelImage image, CancellationToken cancellationToken);
    Task<bool> UpdateImageOrderAsync(HostelImage image, int order, CancellationToken cancellationToken);
    Task<Guid?> GetHostelOwnerIdAsync(Guid hostelId, CancellationToken cancellationToken);
}
