import { describe, it, expect, vi } from 'vitest';
import { HostelListingsService } from '../../../src/hostels/listings/hostel-listings.service';
import { ListingStatus } from '../../../src/common/enums/app.enums';
import {
  AppNotFoundException,
  AppConflictException,
} from '../../../src/common/exceptions/app-exception';
import { withServiceHarness } from '../../helpers';

const makePrisma = () => ({
  hostelListing: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

const makeListing = (overrides: Partial<any> = {}) => ({
  id: 'listing-1',
  hostelId: 'hostel-1',
  ownerUserId: 'user-1',
  status: ListingStatus.Pending,
  createdAt: new Date('2025-01-01'),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('HostelListingsService', () => {
  const ctx = withServiceHarness(
    () => makePrisma(),
    (p) => new HostelListingsService(p as any),
  );

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped listing DTOs', async () => {
      ctx.prisma.hostelListing.findMany.mockResolvedValue([makeListing()]);
      const result = await ctx.service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].hostelId).toBe('hostel-1');
    });

    it('returns empty array when none exist', async () => {
      ctx.prisma.hostelListing.findMany.mockResolvedValue([]);
      expect(await ctx.service.getAll()).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns listing when found', async () => {
      ctx.prisma.hostelListing.findFirst.mockResolvedValue(makeListing());
      const result = await ctx.service.getById('listing-1');
      expect(result.id).toBe('listing-1');
    });

    it('throws AppNotFoundException when not found', async () => {
      ctx.prisma.hostelListing.findFirst.mockResolvedValue(null);
      await expect(ctx.service.getById('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates with explicit status', async () => {
      ctx.prisma.hostelListing.create.mockResolvedValue(makeListing({ status: ListingStatus.Approved }));
      const result = await ctx.service.create({
        hostelId: 'hostel-1',
        ownerUserId: 'user-1',
        status: ListingStatus.Approved,
      });
      expect(result.status).toBe(ListingStatus.Approved);
    });

    it('defaults to Pending when status is omitted', async () => {
      ctx.prisma.hostelListing.create.mockResolvedValue(makeListing());
      await ctx.service.create({ hostelId: 'hostel-1', ownerUserId: 'user-1', status: undefined as any });
      expect(ctx.prisma.hostelListing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ListingStatus.Pending }),
        }),
      );
    });

    it('throws AppConflictException on duplicate hostel+owner pair', async () => {
      ctx.prisma.hostelListing.create.mockRejectedValue(new Error('unique constraint'));
      await expect(
        ctx.service.create({ hostelId: 'h', ownerUserId: 'u', status: ListingStatus.Pending }),
      ).rejects.toThrow(AppConflictException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates listing status', async () => {
      ctx.prisma.hostelListing.findFirst.mockResolvedValue(makeListing());
      ctx.prisma.hostelListing.update.mockResolvedValue(makeListing({ status: ListingStatus.Approved }));
      const result = await ctx.service.update('listing-1', { status: ListingStatus.Approved });
      expect(result.status).toBe(ListingStatus.Approved);
    });

    it('throws AppNotFoundException when listing not found', async () => {
      ctx.prisma.hostelListing.findFirst.mockResolvedValue(null);
      await expect(ctx.service.update('missing', { status: ListingStatus.Rejected })).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes the listing', async () => {
      ctx.prisma.hostelListing.findFirst.mockResolvedValue(makeListing());
      ctx.prisma.hostelListing.update.mockResolvedValue({});
      await ctx.service.delete('listing-1');
      expect(ctx.prisma.hostelListing.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
      );
    });

    it('throws AppNotFoundException when listing not found', async () => {
      ctx.prisma.hostelListing.findFirst.mockResolvedValue(null);
      await expect(ctx.service.delete('missing')).rejects.toThrow(AppNotFoundException);
    });
  });
});
