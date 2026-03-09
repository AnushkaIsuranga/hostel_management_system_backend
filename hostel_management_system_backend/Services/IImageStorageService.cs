using Microsoft.AspNetCore.Http;

public sealed record StoredImageResult(
    string ImageUrl,
    string ContentType,
    long FileSize,
    string StoredFileName
);

public interface IImageStorageService
{
    Task<StoredImageResult> UploadImageAsync(IFormFile file, Guid hostelId, CancellationToken cancellationToken);
    Task<bool> DeleteImageAsync(string imageUrl, CancellationToken cancellationToken);
}
