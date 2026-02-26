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
    private readonly IHostelReviewsRepository _repo;
    private readonly IMapper _mapper;

    public HostelReviewsService(IHostelReviewsRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<List<HostelReviewReadDto>> GetForHostelAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        var hostelExists = await _repo.HostelExistsAsync(hostelId, cancellationToken);
        if (!hostelExists)
        {
            throw new NotFoundException("Hostel not found.");
        }

        var reviews = await _repo.GetForHostelAsNoTrackingWithUserAsync(hostelId, cancellationToken);

        return _mapper.Map<List<HostelReviewReadDto>>(reviews);
    }

    public async Task<HostelRatingSummaryDto> GetSummaryAsync(Guid hostelId, CancellationToken cancellationToken)
    {
        var hostelExists = await _repo.HostelExistsAsync(hostelId, cancellationToken);
        if (!hostelExists)
        {
            throw new NotFoundException("Hostel not found.");
        }

        var count = await _repo.CountForHostelAsync(hostelId, cancellationToken);
        var avg = count == 0
            ? 0.0
            : await _repo.AverageRatingForHostelAsync(hostelId, cancellationToken);

        return new HostelRatingSummaryDto(hostelId, Math.Round(avg, 2), count);
    }

    public async Task<HostelReviewReadDto> CreateAsync(Guid hostelId, Guid userId, HostelReviewCreateDto dto, CancellationToken cancellationToken)
    {
        Validate(dto.Rating, dto.Comment);

        var hostelExists = await _repo.HostelExistsAsync(hostelId, cancellationToken);
        if (!hostelExists)
        {
            throw new NotFoundException("Hostel not found.");
        }

        var userExists = await _repo.UserExistsAsync(userId, cancellationToken);
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

        await _repo.AddAsync(entity, cancellationToken);

        try
        {
            await _repo.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex)
        {
            throw new ConflictException("You have already reviewed this hostel.", "review_conflict", ex);
        }

        var created = await _repo.GetByIdAsNoTrackingWithUserAsync(entity.Id, cancellationToken);

        return _mapper.Map<HostelReviewReadDto>(created);
    }

    public async Task<HostelReviewReadDto> UpdateAsync(Guid hostelId, Guid reviewId, Guid userId, bool isAdmin, HostelReviewUpdateDto dto, CancellationToken cancellationToken)
    {
        Validate(dto.Rating, dto.Comment);

        var entity = await _repo.GetForUpdateWithUserAsync(hostelId, reviewId, cancellationToken);

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

        await _repo.SaveChangesAsync(cancellationToken);

        var updated = await _repo.GetByIdAsNoTrackingWithUserAsync(entity.Id, cancellationToken);

        return _mapper.Map<HostelReviewReadDto>(updated);
    }

    public async Task DeleteAsync(Guid hostelId, Guid reviewId, Guid userId, bool isAdmin, CancellationToken cancellationToken)
    {
        var entity = await _repo.GetForDeleteAsync(hostelId, reviewId, cancellationToken);

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
        await _repo.SaveChangesAsync(cancellationToken);
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
