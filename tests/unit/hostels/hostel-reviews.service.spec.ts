import { describe, it, expect, vi } from 'vitest';
import { HostelReviewsService } from '../../../src/hostels/reviews/hostel-reviews.service';
import {
  AppNotFoundException,
  AppConflictException,
  AppForbiddenException,
  AppUnauthorizedException,
  AppBadRequestException,
} from '../../../src/common/exceptions/app-exception';
import { withServiceHarness } from '../../helpers';

const makePrisma = () => ({
  hostelReview: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
  },
  hostel: {
    findFirst: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
});

const makeReview = (overrides: Partial<any> = {}) => ({
  id: 'review-1',
  hostelId: 'hostel-1',
  userId: 'user-1',
  rating: 4,
  comment: 'Great place',
  createdAt: new Date('2025-01-01'),
  updatedAt: null,
  isDeleted: false,
  user: { fullName: 'Alice' },
  ...overrides,
});

describe('HostelReviewsService', () => {
  const ctx = withServiceHarness(
    () => makePrisma(),
    (p) => new HostelReviewsService(p as any),
  );

  // ── validate (indirectly via create) ─────────────────────────────────────

  describe('validation', () => {
    it('throws AppBadRequestException for rating below 1', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      await expect(
        ctx.service.create('hostel-1', 'user-1', { rating: 0 }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppBadRequestException for rating above 5', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      await expect(
        ctx.service.create('hostel-1', 'user-1', { rating: 6 }),
      ).rejects.toThrow(AppBadRequestException);
    });
  });

  // ── getForHostel ──────────────────────────────────────────────────────────

  describe('getForHostel', () => {
    it('returns reviews for a hostel', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.hostelReview.findMany.mockResolvedValue([makeReview()]);
      const result = await ctx.service.getForHostel('hostel-1');
      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(4);
    });

    it('throws AppNotFoundException when hostel not found', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(ctx.service.getForHostel('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── getSummary ────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns average rating and review count', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.hostelReview.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { _all: 10 },
      });
      const result = await ctx.service.getSummary('hostel-1');
      expect(result.averageRating).toBe(4.5);
      expect(result.reviewCount).toBe(10);
    });

    it('returns 0 averageRating when no reviews', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.hostelReview.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { _all: 0 },
      });
      const result = await ctx.service.getSummary('hostel-1');
      expect(result.averageRating).toBe(0);
    });

    it('throws AppNotFoundException when hostel not found', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(ctx.service.getSummary('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns a review', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      ctx.prisma.hostelReview.create.mockResolvedValue(makeReview());
      const result = await ctx.service.create('hostel-1', 'user-1', { rating: 4, comment: 'Great' });
      expect(result.userId).toBe('user-1');
    });

    it('throws AppUnauthorizedException when user not valid', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        ctx.service.create('hostel-1', 'ghost', { rating: 4 }),
      ).rejects.toThrow(AppUnauthorizedException);
    });

    it('throws AppConflictException on duplicate review', async () => {
      ctx.prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1' });
      ctx.prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      ctx.prisma.hostelReview.create.mockRejectedValue(new Error('unique constraint'));
      await expect(
        ctx.service.create('hostel-1', 'user-1', { rating: 3 }),
      ).rejects.toThrow(AppConflictException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates own review', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(makeReview({ userId: 'user-1' }));
      ctx.prisma.hostelReview.update.mockResolvedValue(makeReview({ rating: 5 }));
      const result = await ctx.service.update('hostel-1', 'review-1', 'user-1', false, { rating: 5 });
      expect(result.rating).toBe(5);
    });

    it('throws AppNotFoundException when review not found', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(null);
      await expect(
        ctx.service.update('hostel-1', 'missing', 'user-1', false, { rating: 3 }),
      ).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppForbiddenException when non-owner tries to update', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(makeReview({ userId: 'owner-user' }));
      await expect(
        ctx.service.update('hostel-1', 'review-1', 'other-user', false, { rating: 3 }),
      ).rejects.toThrow(AppForbiddenException);
    });

    it('allows admin to update any review', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(makeReview({ userId: 'owner-user' }));
      ctx.prisma.hostelReview.update.mockResolvedValue(makeReview({ rating: 2 }));
      const result = await ctx.service.update('hostel-1', 'review-1', 'admin-id', true, { rating: 2 });
      expect(result.rating).toBe(2);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes own review', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(makeReview({ userId: 'user-1' }));
      ctx.prisma.hostelReview.update.mockResolvedValue({});
      await ctx.service.delete('hostel-1', 'review-1', 'user-1', false);
      expect(ctx.prisma.hostelReview.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
      );
    });

    it('throws AppNotFoundException when review not found', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(null);
      await expect(ctx.service.delete('hostel-1', 'missing', 'user-1', false)).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppForbiddenException when non-owner tries to delete', async () => {
      ctx.prisma.hostelReview.findFirst.mockResolvedValue(makeReview({ userId: 'owner-user' }));
      await expect(
        ctx.service.delete('hostel-1', 'review-1', 'other-user', false),
      ).rejects.toThrow(AppForbiddenException);
    });
  });
});
