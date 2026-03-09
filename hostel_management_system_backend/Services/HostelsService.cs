using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Net;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Text.Json;

public interface IHostelsService
{
    Task<List<HostelReadDto>> GetAllAsync(CancellationToken cancellationToken);
    Task<HostelReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<List<HostelSearchResultDto>> SearchAsync(HostelSearchRequestDto request, CancellationToken cancellationToken);
    Task<HostelReadDto> CreateAsync(HostelCreateDto dto, CancellationToken cancellationToken);
    Task<HostelReadDto?> UpdateAsync(Guid id, HostelUpdateDto dto, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<HostelReadDto> RestoreAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class HostelsService : IHostelsService
{
    private const int MaxImagesPerHostel = 8;
    private const int DeletedHostelRestoreRetentionDays = 60;
    private static readonly Regex CoordinatesPlaceDataRegex = new(@"!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex CoordinatesAtRegex = new(@"@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex CoordinatesQueryRegex = new(@"[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private const int MaxRedirects = 5;

    private readonly IHostelRepository _repo;
    private readonly IMapper _mapper;
    private readonly ApplicationDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IWebHostEnvironment _environment;

    public HostelsService(
        IHostelRepository repo,
        IMapper mapper,
        ApplicationDbContext db,
        IHttpClientFactory httpClientFactory,
        IHttpContextAccessor httpContextAccessor,
        IWebHostEnvironment environment)
    {
        _repo = repo;
        _mapper = mapper;
        _db = db;
        _httpClientFactory = httpClientFactory;
        _httpContextAccessor = httpContextAccessor;
        _environment = environment;
    }

    public async Task<List<HostelReadDto>> GetAllAsync(CancellationToken cancellationToken)
    {
        var hostels = await _repo.GetAllWithImagesAsNoTrackingAsync(cancellationToken);
        var mapped = _mapper.Map<List<HostelReadDto>>(hostels);

        return mapped
            .Select(dto => dto.Images.Count > 0
                ? dto
                : dto with { Images = GetFallbackImageUrls(dto.Id) })
            .ToList();
    }

    public async Task<HostelReadDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var hostel = await _repo.GetByIdWithImagesAsNoTrackingAsync(id, cancellationToken);
        if (hostel is null)
            throw new NotFoundException("Hostel not found.");

        var mapped = _mapper.Map<HostelReadDto>(hostel);
        if (mapped.Images.Count > 0)
        {
            return mapped;
        }

        return mapped with { Images = GetFallbackImageUrls(id) };
    }

    public async Task<List<HostelSearchResultDto>> SearchAsync(HostelSearchRequestDto request, CancellationToken cancellationToken)
    {
        var preferenceContext = await BuildPreferenceContextAsync(request, cancellationToken);
        var effectiveRequest = preferenceContext.Request;

        if (effectiveRequest.UniversityId == Guid.Empty)
            throw new BadRequestException("UniversityId is required.");

        var university = await _db.Universities
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == effectiveRequest.UniversityId, cancellationToken);

        if (university is null)
            throw new NotFoundException("University not found.");

        var query = _db.Hostels
            .AsNoTracking()
            .Include(h => h.Owner)
            .Include(h => h.Images)
            .Include(h => h.Rooms)
            .Include(h => h.Reviews)
            .Include(h => h.HostelAmenities)
            .AsQueryable();

        if (effectiveRequest.MinBudget.HasValue)
        {
            query = query.Where(h => h.MaxPrice >= effectiveRequest.MinBudget.Value);
        }

        if (effectiveRequest.MaxBudget.HasValue)
        {
            query = query.Where(h => h.MinPrice <= effectiveRequest.MaxBudget.Value);
        }

        if (!string.IsNullOrWhiteSpace(effectiveRequest.GenderPolicy))
        {
            query = query.Where(h => h.GenderPolicy == effectiveRequest.GenderPolicy);
        }

        if (effectiveRequest.RequiredCapacity.HasValue)
        {
            query = query.Where(h => h.Rooms.Any(r => r.IsAvailable && r.Capacity >= effectiveRequest.RequiredCapacity.Value));
        }

        if (effectiveRequest.AmenityIds is { Count: > 0 })
        {
            foreach (var amenityId in effectiveRequest.AmenityIds.Distinct())
            {
                query = query.Where(h => h.HostelAmenities.Any(ha => ha.AmenityId == amenityId));
            }
        }

        var hostels = await query.ToListAsync(cancellationToken);
        if (hostels.Count == 0)
            return new List<HostelSearchResultDto>();

        var weights = NormalizeWeights(effectiveRequest.Weights);

        var shaped = hostels.Select(h => new
        {
            Hostel = h,
            DistanceKm = CalculateDistanceKm(university.Latitude, university.Longitude, h.Latitude, h.Longitude),
            AverageRating = h.Reviews.Count == 0 ? 0d : h.Reviews.Average(r => (double)r.Rating)
        }).ToList();

        var minPrice = shaped.Min(x => x.Hostel.MinPrice);
        var maxPrice = shaped.Max(x => x.Hostel.MinPrice);
        var minDistance = shaped.Min(x => x.DistanceKm);
        var maxDistance = shaped.Max(x => x.DistanceKm);
        var minRating = shaped.Min(x => x.AverageRating);
        var maxRating = shaped.Max(x => x.AverageRating);

        var ranked = shaped
            .Select(x =>
            {
                var normalizedPrice = NormalizeLowerBetter((double)x.Hostel.MinPrice, (double)minPrice, (double)maxPrice);
                var normalizedDistance = NormalizeLowerBetter(x.DistanceKm, minDistance, maxDistance);
                var normalizedRating = NormalizeHigherBetter(x.AverageRating, minRating, maxRating);

                var baseScore =
                    (normalizedPrice * weights.PriceWeight) +
                    (normalizedDistance * weights.DistanceWeight) +
                    (normalizedRating * weights.RatingWeight);

                var preferenceScore = CalculatePreferenceBoost(
                    x.Hostel,
                    preferenceContext.PreferredMinBudget,
                    preferenceContext.PreferredMaxBudget,
                    preferenceContext.PreferredCapacity,
                    preferenceContext.PreferredAmenityIds);

                var score = preferenceContext.HasRankingPreferences
                    ? ((baseScore * 0.85d) + (preferenceScore * 0.15d))
                    : baseScore;

                return new HostelSearchResultDto(
                    _mapper.Map<HostelReadDto>(x.Hostel),
                    Math.Round(x.DistanceKm, 2),
                    Math.Round(x.AverageRating, 2),
                    Math.Round(score, 4));
            })
            .OrderByDescending(x => x.Score)
            .ThenBy(x => x.DistanceKm)
            .ToList();

        return ranked;
    }

    private async Task<PreferenceContext> BuildPreferenceContextAsync(HostelSearchRequestDto request, CancellationToken cancellationToken)
    {
        var userId = TryGetCurrentUserId();
        if (!userId.HasValue)
        {
            return new PreferenceContext(
                request,
                null,
                null,
                null,
                [],
                false);
        }

        var preference = await _db.StudentPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId.Value, cancellationToken);

        if (preference is null)
        {
            return new PreferenceContext(
                request,
                null,
                null,
                null,
                [],
                false);
        }

        var universityId = request.UniversityId == Guid.Empty ? preference.UniversityId : request.UniversityId;
        var preferredAmenityIds = new List<Guid>();
        var amenityNames = DeserializeStringList(preference.SelectedAmenitiesJson);
        if (amenityNames.Count > 0)
        {
            preferredAmenityIds = await _db.Amenities
                .AsNoTracking()
                .Where(a => amenityNames.Contains(a.Name))
                .Select(a => a.Id)
                .ToListAsync(cancellationToken);
        }

        var weights = request.Weights ?? new HostelSearchWeightsDto(
            preference.PriceWeight,
            preference.DistanceWeight,
            preference.RatingWeight);

        var effectiveRequest = request with
        {
            UniversityId = universityId,
            Weights = weights
        };

        var hasRankingPreferences =
            preference.MinBudget.HasValue ||
            preference.MaxBudget.HasValue ||
            preference.RequiredCapacity.HasValue ||
            preferredAmenityIds.Count > 0;

        return new PreferenceContext(
            effectiveRequest,
            preference.MinBudget,
            preference.MaxBudget,
            preference.RequiredCapacity,
            preferredAmenityIds,
            hasRankingPreferences);
    }

    private Guid? TryGetCurrentUserId()
    {
        var principal = _httpContextAccessor.HttpContext?.User;
        if (principal is null)
            return null;

        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(sub, out var userId) ? userId : null;
    }

    private static List<string> DeserializeStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static double CalculatePreferenceBoost(
        Hostel hostel,
        decimal? preferredMinBudget,
        decimal? preferredMaxBudget,
        int? preferredCapacity,
        List<Guid> preferredAmenityIds)
    {
        var budgetScore = CalculateBudgetScore(hostel.MinPrice, preferredMinBudget, preferredMaxBudget);
        var capacityScore = CalculateCapacityScore(hostel.Rooms, preferredCapacity);
        var amenityScore = CalculateAmenityScore(hostel.HostelAmenities, preferredAmenityIds);

        return (budgetScore * 0.35d) + (capacityScore * 0.25d) + (amenityScore * 0.40d);
    }

    private static double CalculateBudgetScore(decimal hostelPrice, decimal? preferredMinBudget, decimal? preferredMaxBudget)
    {
        if (!preferredMinBudget.HasValue && !preferredMaxBudget.HasValue)
            return 1d;

        if (preferredMinBudget.HasValue && hostelPrice < preferredMinBudget.Value)
        {
            var gap = (double)(preferredMinBudget.Value - hostelPrice);
            return 1d / (1d + (gap / Math.Max(1d, (double)preferredMinBudget.Value)));
        }

        if (preferredMaxBudget.HasValue && hostelPrice > preferredMaxBudget.Value)
        {
            var gap = (double)(hostelPrice - preferredMaxBudget.Value);
            return 1d / (1d + (gap / Math.Max(1d, (double)preferredMaxBudget.Value)));
        }

        return 1d;
    }

    private static double CalculateCapacityScore(ICollection<Room> rooms, int? preferredCapacity)
    {
        if (!preferredCapacity.HasValue)
            return 1d;

        var bestAvailable = rooms
            .Where(r => r.IsAvailable)
            .Select(r => r.Capacity)
            .DefaultIfEmpty(0)
            .Max();

        if (bestAvailable <= 0)
            return 0d;

        if (bestAvailable >= preferredCapacity.Value)
            return 1d;

        return (double)bestAvailable / preferredCapacity.Value;
    }

    private static double CalculateAmenityScore(ICollection<HostelAmenity> hostelAmenities, List<Guid> preferredAmenityIds)
    {
        if (preferredAmenityIds.Count == 0)
            return 1d;

        var hostelAmenityIds = hostelAmenities.Select(x => x.AmenityId).ToHashSet();
        var matched = preferredAmenityIds.Count(id => hostelAmenityIds.Contains(id));
        return (double)matched / preferredAmenityIds.Count;
    }

    private sealed record PreferenceContext(
        HostelSearchRequestDto Request,
        decimal? PreferredMinBudget,
        decimal? PreferredMaxBudget,
        int? PreferredCapacity,
        List<Guid> PreferredAmenityIds,
        bool HasRankingPreferences);

    public async Task<HostelReadDto> CreateAsync(HostelCreateDto dto, CancellationToken cancellationToken)
    {
        var entity = _mapper.Map<Hostel>(dto);
        await ApplyCoordinatesAsync(entity, dto.Latitude, dto.Longitude, dto.GoogleMapsUrl, cancellationToken);

        entity.GoogleMapsUrl ??= string.Empty;
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
        await ApplyCoordinatesAsync(entity, dto.Latitude, dto.Longitude, dto.GoogleMapsUrl, cancellationToken);
        entity.GoogleMapsUrl ??= string.Empty;

        if (dto.Images is { Count: > 0 })
        {
            var imageUrls = dto.Images.Where(i => !string.IsNullOrWhiteSpace(i)).ToList();
            if (imageUrls.Count > MaxImagesPerHostel)
            {
                throw new BadRequestException($"Maximum {MaxImagesPerHostel} images are allowed per hostel.");
            }

            foreach (var existing in entity.Images)
            {
                existing.IsDeleted = true;
                existing.DeletedAt = DateTime.UtcNow;
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

        var deletedAt = DateTime.UtcNow;

        foreach (var image in entity.Images.Where(i => !i.IsDeleted))
        {
            image.IsDeleted = true;
            image.DeletedAt = deletedAt;
            image.UpdatedAt = deletedAt;
        }

        entity.IsDeleted = true;
        entity.DeletedAt = deletedAt;
        entity.UpdatedAt = DateTime.UtcNow;
        await _repo.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<HostelReadDto> RestoreAsync(Guid id, CancellationToken cancellationToken)
    {
        var hostel = await _db.Hostels
            .IgnoreQueryFilters()
            .Include(h => h.Owner)
            .Include(h => h.Images)
            .FirstOrDefaultAsync(h => h.Id == id, cancellationToken);

        if (hostel is null)
            throw new NotFoundException("Hostel not found.");

        if (!hostel.IsDeleted)
            throw new BadRequestException("Hostel is already active.");

        if (hostel.DeletedAt.HasValue && hostel.DeletedAt.Value < DateTime.UtcNow.AddDays(-DeletedHostelRestoreRetentionDays))
            throw new BadRequestException("Hostel cannot be restored after the retention window.");

        hostel.IsDeleted = false;
        hostel.DeletedAt = null;
        hostel.UpdatedAt = DateTime.UtcNow;

        foreach (var image in hostel.Images.Where(i => i.IsDeleted))
        {
            image.IsDeleted = false;
            image.DeletedAt = null;
            image.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);

        var mapped = _mapper.Map<HostelReadDto>(hostel);
        if (mapped.Images.Count > 0)
        {
            return mapped;
        }

        return mapped with { Images = GetFallbackImageUrls(id) };
    }

    private async Task ApplyCoordinatesAsync(Hostel entity, double? latitude, double? longitude, string? googleMapsUrl, CancellationToken cancellationToken)
    {
        var hasCoordinates = latitude.HasValue && longitude.HasValue;

        if (hasCoordinates)
        {
            ValidateCoordinates(latitude!.Value, longitude!.Value);
            entity.Latitude = latitude.Value;
            entity.Longitude = longitude.Value;
            entity.GoogleMapsUrl = BuildCanonicalGoogleMapsUrl(entity.Latitude, entity.Longitude);
            return;
        }

        if (string.IsNullOrWhiteSpace(googleMapsUrl))
            throw new BadRequestException("Provide latitude/longitude or a valid Google Maps URL.");

        var extracted = await ExtractCoordinatesFromUrlAsync(googleMapsUrl, cancellationToken);
        entity.Latitude = extracted.lat;
        entity.Longitude = extracted.lng;
        entity.GoogleMapsUrl = BuildCanonicalGoogleMapsUrl(entity.Latitude, entity.Longitude);
    }

    private async Task<(double lat, double lng)> ExtractCoordinatesFromUrlAsync(string url, CancellationToken cancellationToken)
    {
        if (TryExtractCoordinates(url, out var coords))
        {
            return coords;
        }

        var resolvedUrl = await ResolveGoogleMapsUrlAsync(url, cancellationToken);
        if (TryExtractCoordinates(resolvedUrl, out coords))
        {
            return coords;
        }

        throw new BadRequestException("Coordinates were not found in the provided Google Maps URL.");
    }

    private async Task<string> ResolveGoogleMapsUrlAsync(string inputUrl, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(inputUrl, UriKind.Absolute, out var currentUri))
            return inputUrl;

        var client = _httpClientFactory.CreateClient("GoogleMapsResolver");

        for (var hop = 0; hop < MaxRedirects; hop++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, currentUri);
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            if (!IsRedirectStatusCode(response.StatusCode))
            {
                return currentUri.ToString();
            }

            var location = response.Headers.Location;
            if (location is null)
            {
                return currentUri.ToString();
            }

            currentUri = location.IsAbsoluteUri ? location : new Uri(currentUri, location);
        }

        return currentUri.ToString();
    }

    private static bool IsRedirectStatusCode(HttpStatusCode statusCode)
    {
        return statusCode == HttpStatusCode.MovedPermanently ||
               statusCode == HttpStatusCode.Redirect ||
               statusCode == HttpStatusCode.RedirectMethod ||
               statusCode == HttpStatusCode.TemporaryRedirect ||
               statusCode == HttpStatusCode.PermanentRedirect;
    }

    private static bool TryExtractCoordinates(string url, out (double lat, double lng) coordinates)
    {
        if (TryExtractCoordinatesWithRegex(CoordinatesPlaceDataRegex, url, out coordinates))
            return true;

        if (TryExtractCoordinatesWithRegex(CoordinatesAtRegex, url, out coordinates))
            return true;

        if (TryExtractCoordinatesWithRegex(CoordinatesQueryRegex, url, out coordinates))
            return true;

        coordinates = default;
        return false;
    }

    private static string BuildCanonicalGoogleMapsUrl(double latitude, double longitude)
    {
        var lat = latitude.ToString("0.#######", CultureInfo.InvariantCulture);
        var lng = longitude.ToString("0.#######", CultureInfo.InvariantCulture);
        return $"https://www.google.com/maps?q={lat},{lng}";
    }

    private static bool TryExtractCoordinatesWithRegex(Regex regex, string input, out (double lat, double lng) coordinates)
    {
        coordinates = default;
        var match = regex.Match(input);
        if (!match.Success)
            return false;

        if (!double.TryParse(match.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat) ||
            !double.TryParse(match.Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lng))
        {
            return false;
        }

        ValidateCoordinates(lat, lng);
        coordinates = (lat, lng);
        return true;
    }

    private static void ValidateCoordinates(double latitude, double longitude)
    {
        if (latitude < -90 || latitude > 90)
            throw new BadRequestException("Latitude must be between -90 and 90.");

        if (longitude < -180 || longitude > 180)
            throw new BadRequestException("Longitude must be between -180 and 180.");
    }

    private static HostelSearchWeightsDto NormalizeWeights(HostelSearchWeightsDto? input)
    {
        var price = input?.PriceWeight ?? 0.4;
        var distance = input?.DistanceWeight ?? 0.4;
        var rating = input?.RatingWeight ?? 0.2;

        if (price < 0 || distance < 0 || rating < 0)
            throw new BadRequestException("Weights cannot be negative.");

        var sum = price + distance + rating;
        if (sum <= 0)
            throw new BadRequestException("At least one weight must be greater than zero.");

        return new HostelSearchWeightsDto(price / sum, distance / sum, rating / sum);
    }

    private static double NormalizeLowerBetter(double value, double min, double max)
    {
        if (Math.Abs(max - min) < double.Epsilon)
            return 1d;

        return 1d - ((value - min) / (max - min));
    }

    private static double NormalizeHigherBetter(double value, double min, double max)
    {
        if (Math.Abs(max - min) < double.Epsilon)
            return 1d;

        return (value - min) / (max - min);
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double earthRadiusKm = 6371;

        var dLat = DegreesToRadians(lat2 - lat1);
        var dLon = DegreesToRadians(lon2 - lon1);

        var a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(DegreesToRadians(lat1)) *
            Math.Cos(DegreesToRadians(lat2)) *
            Math.Sin(dLon / 2) *
            Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * (Math.PI / 180d);
    }

    private List<string> GetFallbackImageUrls(Guid hostelId)
    {
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;

        var urls = new List<string>();

        var modernFullDirectory = Path.Combine(webRoot, "uploads", "hostels", hostelId.ToString(), "full");
        if (Directory.Exists(modernFullDirectory))
        {
            urls.AddRange(Directory
                .EnumerateFiles(modernFullDirectory)
                .Select(Path.GetFileName)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .OrderBy(name => name)
                .Select(name => $"/uploads/hostels/{hostelId}/full/{name}"));
        }

        var legacyDirectory = Path.Combine(webRoot, "uploads", hostelId.ToString());
        if (Directory.Exists(legacyDirectory))
        {
            urls.AddRange(Directory
                .EnumerateFiles(legacyDirectory)
                .Select(Path.GetFileName)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .OrderBy(name => name)
                .Select(name => $"/uploads/{hostelId}/{name}"));
        }

        return urls
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
