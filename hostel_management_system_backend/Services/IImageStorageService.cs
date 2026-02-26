using Microsoft.AspNetCore.Http;

public interface IImageStorageService
{
    Task<string> UploadImageAsync(IFormFile file, Guid hostelId, CancellationToken cancellationToken);
    Task<bool> DeleteImageAsync(string imageUrl, CancellationToken cancellationToken);
}
