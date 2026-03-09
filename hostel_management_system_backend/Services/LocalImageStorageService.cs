using hostel_management_system_backend.Exceptions;
using Microsoft.AspNetCore.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

public sealed class LocalImageStorageService : IImageStorageService
{
    private const long MaxImageSizeBytes = 5 * 1024 * 1024;
    private const string StoredContentType = "image/webp";

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/png",
        "image/webp"
    };

    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public LocalImageStorageService(IWebHostEnvironment environment, IConfiguration configuration)
    {
        _environment = environment;
        _configuration = configuration;
    }

    public async Task<StoredImageResult> UploadImageAsync(IFormFile file, Guid hostelId, CancellationToken cancellationToken)
    {
        ValidateImage(file);

        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;

        var hostelFolder = Path.Combine(webRoot, "uploads", "hostels", hostelId.ToString());
        var thumbnailFolder = Path.Combine(hostelFolder, "thumbnail");
        var cardFolder = Path.Combine(hostelFolder, "card");
        var fullFolder = Path.Combine(hostelFolder, "full");
        Directory.CreateDirectory(thumbnailFolder);
        Directory.CreateDirectory(cardFolder);
        Directory.CreateDirectory(fullFolder);

        var baseFileName = Guid.NewGuid().ToString("N");
        var storedFileName = $"{baseFileName}.webp";

        var thumbnailRelative = $"/uploads/hostels/{hostelId}/thumbnail/{storedFileName}";
        var cardRelative = $"/uploads/hostels/{hostelId}/card/{storedFileName}";
        var fullRelative = $"/uploads/hostels/{hostelId}/full/{storedFileName}";

        var thumbnailPath = Path.Combine(thumbnailFolder, storedFileName);
        var cardPath = Path.Combine(cardFolder, storedFileName);
        var fullPath = Path.Combine(fullFolder, storedFileName);

        await using var uploadStream = file.OpenReadStream();

        Image image;
        try
        {
            image = await Image.LoadAsync(uploadStream, cancellationToken);
        }
        catch (UnknownImageFormatException)
        {
            throw new BadRequestException("Invalid image type. Allowed types are jpeg, png, webp.");
        }

        using (image)
        {
            var encoder = new WebpEncoder { Quality = 80 };
            await SaveResizedAsync(image, 300, thumbnailPath, encoder, cancellationToken);
            await SaveResizedAsync(image, 600, cardPath, encoder, cancellationToken);
            await SaveResizedAsync(image, 1200, fullPath, encoder, cancellationToken);
        }

        var fullImageFileInfo = new FileInfo(fullPath);
        var imageUrl = BuildPublicUrl(fullRelative);

        return new StoredImageResult(
            imageUrl,
            StoredContentType,
            fullImageFileInfo.Exists ? fullImageFileInfo.Length : 0,
            storedFileName
        );
    }

    public Task<bool> DeleteImageAsync(string imageUrl, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return Task.FromResult(false);
        }

        var imagePath = ExtractPath(imageUrl);
        if (string.IsNullOrWhiteSpace(imagePath) || !imagePath.StartsWith('/'))
        {
            return Task.FromResult(false);
        }

        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;

        var deleted = false;
        foreach (var relativeVariantPath in GetVariantRelativePaths(imagePath))
        {
            var relativePath = relativeVariantPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            var fullPath = Path.Combine(webRoot, relativePath);
            if (!File.Exists(fullPath))
            {
                continue;
            }

            File.Delete(fullPath);
            deleted = true;
        }

        return Task.FromResult(deleted);
    }

    private static void ValidateImage(IFormFile file)
    {
        if (file.Length <= 0)
        {
            throw new BadRequestException("Image file is required.");
        }

        if (file.Length > MaxImageSizeBytes)
        {
            throw new BadRequestException("Image too large. Maximum allowed size is 5MB.");
        }

        if (string.IsNullOrWhiteSpace(file.ContentType) || !AllowedContentTypes.Contains(file.ContentType))
        {
            throw new BadRequestException("Invalid image type. Allowed types are jpeg, png, webp.");
        }
    }

    private static async Task SaveResizedAsync(
        Image original,
        int width,
        string outputPath,
        IImageEncoder encoder,
        CancellationToken cancellationToken)
    {
        using var resized = original.Clone(ctx =>
            ctx.Resize(new ResizeOptions
            {
                Size = new Size(width, 0),
                Mode = ResizeMode.Max
            }));

        await using var outputStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await resized.SaveAsync(outputStream, encoder, cancellationToken);
    }

    private string BuildPublicUrl(string relativePath)
    {
        var cdnBaseUrl = _configuration["ImageStorage:CdnBaseUrl"];
        if (string.IsNullOrWhiteSpace(cdnBaseUrl))
        {
            return relativePath;
        }

        return $"{cdnBaseUrl.TrimEnd('/')}{relativePath}";
    }

    private static string? ExtractPath(string imageUrl)
    {
        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var absoluteUri))
        {
            return absoluteUri.AbsolutePath;
        }

        return imageUrl;
    }

    private static IEnumerable<string> GetVariantRelativePaths(string imagePath)
    {
        if (imagePath.Contains("/full/", StringComparison.OrdinalIgnoreCase))
        {
            yield return imagePath;
            yield return imagePath.Replace("/full/", "/card/", StringComparison.OrdinalIgnoreCase);
            yield return imagePath.Replace("/full/", "/thumbnail/", StringComparison.OrdinalIgnoreCase);
            yield break;
        }

        if (imagePath.Contains("/card/", StringComparison.OrdinalIgnoreCase))
        {
            yield return imagePath;
            yield return imagePath.Replace("/card/", "/full/", StringComparison.OrdinalIgnoreCase);
            yield return imagePath.Replace("/card/", "/thumbnail/", StringComparison.OrdinalIgnoreCase);
            yield break;
        }

        if (imagePath.Contains("/thumbnail/", StringComparison.OrdinalIgnoreCase))
        {
            yield return imagePath;
            yield return imagePath.Replace("/thumbnail/", "/full/", StringComparison.OrdinalIgnoreCase);
            yield return imagePath.Replace("/thumbnail/", "/card/", StringComparison.OrdinalIgnoreCase);
            yield break;
        }

        yield return imagePath;
    }
}
