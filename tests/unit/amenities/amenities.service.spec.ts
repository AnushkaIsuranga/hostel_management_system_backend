import { describe, it, expect, vi } from 'vitest';
import { AmenitiesService } from '../../../src/amenities/amenities.service';
import {
  AppNotFoundException,
  AppConflictException,
  AppBadRequestException,
} from '../../../src/common/exceptions/app-exception';
import { makeAmenity, withServiceHarness } from '../../helpers';

const makePrisma = () => ({
  amenity: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

describe('AmenitiesService', () => {
  const ctx = withServiceHarness(
    () => makePrisma(),
    (p) => new AmenitiesService(p as any),
  );

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped amenity DTOs', async () => {
      ctx.prisma.amenity.findMany.mockResolvedValue([makeAmenity()]);
      const result = await ctx.service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('WiFi');
    });

    it('returns empty array when none exist', async () => {
      ctx.prisma.amenity.findMany.mockResolvedValue([]);
      expect(await ctx.service.getAll()).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns amenity when found', async () => {
      ctx.prisma.amenity.findFirst.mockResolvedValue(makeAmenity());
      const result = await ctx.service.getById('amenity-1');
      expect(result.id).toBe('amenity-1');
    });

    it('throws AppNotFoundException when not found', async () => {
      ctx.prisma.amenity.findFirst.mockResolvedValue(null);
      await expect(ctx.service.getById('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a new amenity', async () => {
      ctx.prisma.amenity.findMany.mockResolvedValue([]);
      ctx.prisma.amenity.create.mockResolvedValue(makeAmenity());
      const result = await ctx.service.create({ name: 'WiFi' });
      expect(result.name).toBe('WiFi');
    });

    it('throws AppBadRequestException for empty name', async () => {
      await expect(ctx.service.create({ name: '' })).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppConflictException when all names already exist', async () => {
      ctx.prisma.amenity.findMany.mockResolvedValue([makeAmenity({ name: 'WiFi' })]);
      await expect(ctx.service.create({ name: 'WiFi' })).rejects.toThrow(AppConflictException);
    });

    it('skips duplicates and creates only new names (comma-separated)', async () => {
      ctx.prisma.amenity.findMany.mockResolvedValue([makeAmenity({ name: 'WiFi' })]);
      ctx.prisma.amenity.create.mockResolvedValue(makeAmenity({ id: 'amenity-2', name: 'Pool' }));
      const result = await ctx.service.create({ name: 'WiFi, Pool' });
      expect(result.name).toBe('Pool');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns amenity', async () => {
      ctx.prisma.amenity.findFirst
        .mockResolvedValueOnce(makeAmenity())   // existence check
        .mockResolvedValueOnce(null);            // duplicate check
      ctx.prisma.amenity.update.mockResolvedValue(makeAmenity({ name: 'Gym' }));
      ctx.prisma.amenity.findMany.mockResolvedValue([]);
      const result = await ctx.service.update('amenity-1', { name: 'Gym' });
      expect(result.name).toBe('Gym');
    });

    it('throws AppNotFoundException when amenity not found', async () => {
      ctx.prisma.amenity.findFirst.mockResolvedValue(null);
      await expect(ctx.service.update('missing', { name: 'Gym' })).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppBadRequestException for empty name', async () => {
      ctx.prisma.amenity.findFirst.mockResolvedValue(makeAmenity());
      await expect(ctx.service.update('amenity-1', { name: '' })).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppConflictException when name already taken', async () => {
      ctx.prisma.amenity.findFirst
        .mockResolvedValueOnce(makeAmenity())                     // existence check
        .mockResolvedValueOnce(makeAmenity({ id: 'other-id' })); // duplicate check
      await expect(ctx.service.update('amenity-1', { name: 'Pool' })).rejects.toThrow(AppConflictException);
    });
  });
});
