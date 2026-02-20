using AutoMapper;
using hostel_management_system_backend.Exceptions;
using Microsoft.EntityFrameworkCore;

public interface IHostelReviewsService
{
    Task<List<HostelReviewReadDto>> GetForHostelAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<HostelRatingSummaryDto> GetSummaryAsync(Guid hostelId, CancellationToken cancellationToken);
    Task<HostelReviewReadDto> CreateAsync(Guid hostelId, Guid userId, HostelReviewCreateDto dto, CancellationToken cancellationToken);
    Task<HostelReviewReadDto> UpdateAsync(Guid hostelId, Guid reviewId, Guid userId, bool isAdmin, HostelReviewUpdateDto dto, CancellationToken cancellationToken);
    Task DeleteAsync(Guid hostelId, Guid reviewId, Guid userId, bool isAdmin, CancellationToken cancellationToken);
}

public sealed class HostelReviewsService : IHostelReviewsService
{
    private readonly ApplicationDbContext _db;
    private readonly IMapper _mapper;

    public HostelReviewsService(ApplicationDbContext db, IMapper mapper)
    {
        _db = db;
        _mapper = mapper;
    }

    public async Task<List<HostelReviewReadDto>> GetForHostelAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        var hostelExists = await _db.Hostels.AnyAsync(h => h.Id == hostelId, cancellationToken);
        if (!hostelExists)
        {
            throw new NotFoundException("Hostel not found.");
        }

        var reviews = await _db.HostelReviews
            .AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.HostelId == hostelId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        return _mapper.Map<List<HostelReviewReadDto>>(reviews);
    }

    public async Task<HostelRatingSummaryDto> GetSummaryAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        var hostelExists = await _db.Hostels.AnyAsync(h => h.Id == hostelId, cancellationToken);
        if (!hostelExists)
        {
            throw new NotFoundException("Hostel not found.");
        }

        var query = _db.HostelReviews.AsNoTracking().Where(r => r.HostelId == hostelId);
        var count = await query.CountAsync(cancellationToken);
        var avg = count == 0
            ? 0.0
            : await query.AverageAsync(r => (double)r.Rating, cancellationToken);

        return new HostelRatingSummaryDto(hostelId, Math.Round(avg, 2), count);
    }

    public async Task<HostelReviewReadDto> CreateAsync(Guid hostelId, Guid userId, HostelReviewCreateDto dto, CancellationToken cancellationToken)
    {
        Validate(dto.Rating, dto.Comment);

        var hostelExists = await _db.Hostels.AnyAsync(h => h.Id == hostelId, cancellationToken);
        if (!hostelExists)
        {
            throw new NotFoundException("Hostel not found.");
        }

        var userExists = await _db.Users.AnyAsync(u => u.Id == userId, cancellationToken);
        if (!userExists)
        {
            throw new UnauthorizedException("User is not valid.");
        }

        var entity = new HostelReview
        {
            HostelId = hostelId,
            UserId = userId,
            Rating = dto.Rating,
            Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = null,
            IsDeleted = false
        };

        _db.HostelReviews.Add(entity);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new ConflictException("You have already reviewed this hostel.", "review_conflict", ex);
        }

        var created = await _db.HostelReviews
            .AsNoTracking()
            .Include(r => r.User)
            .FirstAsync(r => r.Id == entity.Id, cancellationToken);

        return _mapper.Map<HostelReviewReadDto>(created);
    }

    public async Task<HostelReviewReadDto> UpdateAsync(Guid hostelId, Guid reviewId, Guid userId, bool isAdmin, HostelReviewUpdateDto dto, CancellationToken cancellationToken)
    {
        Validate(dto.Rating, dto.Comment);

        var entity = await _db.HostelReviews
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.HostelId == hostelId, cancellationToken);

        if (entity is null)
        {
            throw new NotFoundException("Review not found.");
        }

        if (!isAdmin && entity.UserId != userId)
        {
            throw new ForbiddenException("You cannot modify this review.");
        }

        entity.Rating = dto.Rating;
        entity.Comment = string.IsNullOrWhiteSpace(dto.Comment) ? null : dto.Comment.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var updated = await _db.HostelReviews
            .AsNoTracking()
            .Include(r => r.User)
            .FirstAsync(r => r.Id == entity.Id, cancellationToken);

        return _mapper.Map<HostelReviewReadDto>(updated);
    }

    public async Task DeleteAsync(Guid hostelId, Guid reviewId, Guid userId, bool isAdmin, CancellationToken cancellationToken)
    {
        var entity = await _db.HostelReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId && r.HostelId == hostelId, cancellationToken);

        if (entity is null)
        {
            throw new NotFoundException("Review not found.");
        }

        if (!isAdmin && entity.UserId != userId)
        {
            throw new ForbiddenException("You cannot delete this review.");
        }

        entity.IsDeleted = true;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static void Validate(int rating, string? comment)
    {
        if (rating is < 1 or > 5)
        {
            throw new BadRequestException("Rating must be between 1 and 5.", "rating_out_of_range");
        }

        if (comment is not null && comment.Length > 1000)
        {
            throw new BadRequestException("Comment cannot exceed 1000 characters.", "comment_too_long");
        }
    }
}
