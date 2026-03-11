import { Injectable } from '@nestjs/common';

import {
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppNotFoundException,
  AppUnauthorizedException,
} from '../../common/exceptions/app-exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HostelRatingSummaryDto,
  HostelReviewCreateDto,
  HostelReviewReadDto,
  HostelReviewUpdateDto,
} from './dto/hostel-reviews.dto';

@Injectable()
export class HostelReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForHostel(hostelId: string): Promise<HostelReviewReadDto[]> {
    await this.ensureHostelExists(hostelId);

    const reviews = await this.prisma.hostelReview.findMany({
      where: {
        hostelId,
        isDeleted: false,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review) => this.toReadDto(review));
  }

  async getSummary(hostelId: string): Promise<HostelRatingSummaryDto> {
    await this.ensureHostelExists(hostelId);

    const aggregate = await this.prisma.hostelReview.aggregate({
      where: {
        hostelId,
        isDeleted: false,
      },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return {
      hostelId,
      averageRating: Math.round((aggregate._avg.rating ?? 0) * 100) / 100,
      reviewCount: aggregate._count._all,
    };
  }

  async create(hostelId: string, userId: string, dto: HostelReviewCreateDto): Promise<HostelReviewReadDto> {
    this.validate(dto.rating, dto.comment);
    await this.ensureHostelExists(hostelId);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new AppUnauthorizedException('User is not valid.');
    }

    try {
      const review = await this.prisma.hostelReview.create({
        data: {
          hostelId,
          userId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
          createdAt: new Date(),
          isDeleted: false,
        },
        include: {
          user: true,
        },
      });

      return this.toReadDto(review);
    } catch {
      throw new AppConflictException('You have already reviewed this hostel.', 'review_conflict');
    }
  }

  async update(
    hostelId: string,
    reviewId: string,
    userId: string,
    isAdmin: boolean,
    dto: HostelReviewUpdateDto,
  ): Promise<HostelReviewReadDto> {
    this.validate(dto.rating, dto.comment);

    const review = await this.prisma.hostelReview.findFirst({
      where: {
        id: reviewId,
        hostelId,
        isDeleted: false,
      },
      include: {
        user: true,
      },
    });

    if (!review) {
      throw new AppNotFoundException('Review not found.');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new AppForbiddenException('You cannot modify this review.');
    }

    const updated = await this.prisma.hostelReview.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        updatedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    return this.toReadDto(updated);
  }

  async delete(hostelId: string, reviewId: string, userId: string, isAdmin: boolean) {
    const review = await this.prisma.hostelReview.findFirst({
      where: {
        id: reviewId,
        hostelId,
        isDeleted: false,
      },
    });

    if (!review) {
      throw new AppNotFoundException('Review not found.');
    }

    if (!isAdmin && review.userId !== userId) {
      throw new AppForbiddenException('You cannot delete this review.');
    }

    await this.prisma.hostelReview.update({
      where: { id: reviewId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private async ensureHostelExists(hostelId: string) {
    const hostel = await this.prisma.hostel.findFirst({
      where: {
        id: hostelId,
        isDeleted: false,
      },
      select: { id: true },
    });

    if (!hostel) {
      throw new AppNotFoundException('Hostel not found.');
    }
  }

  private validate(rating: number, comment?: string | null) {
    if (rating < 1 || rating > 5) {
      throw new AppBadRequestException('Rating must be between 1 and 5.', 'rating_out_of_range');
    }

    if (comment && comment.length > 1000) {
      throw new AppBadRequestException('Comment cannot exceed 1000 characters.', 'comment_too_long');
    }
  }

  private toReadDto(review: any): HostelReviewReadDto {
    return {
      id: review.id,
      hostelId: review.hostelId,
      userId: review.userId,
      userFullName: review.user.fullName,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}
