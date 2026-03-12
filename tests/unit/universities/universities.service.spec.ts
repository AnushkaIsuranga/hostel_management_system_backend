import { describe, it, expect, vi } from 'vitest';
import { UniversitiesService } from '../../../src/universities/universities.service';
import {
  AppNotFoundException,
  AppConflictException,
  AppBadRequestException,
} from '../../../src/common/exceptions/app-exception';
import { withServiceHarness } from '../../helpers';

const makePrisma = () => ({
  university: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

const makeUniversity = (overrides: Partial<any> = {}) => ({
  id: 'uni-1',
  name: 'Test University',
  latitude: 6.9271,
  longitude: 79.8612,
  createdAt: new Date('2025-01-01'),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('UniversitiesService', () => {
  const ctx = withServiceHarness(
    () => makePrisma(),
    (p) => new UniversitiesService(p as any),
  );

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped university DTOs', async () => {
      ctx.prisma.university.findMany.mockResolvedValue([makeUniversity()]);
      const result = await ctx.service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test University');
    });

    it('returns empty array when none exist', async () => {
      ctx.prisma.university.findMany.mockResolvedValue([]);
      expect(await ctx.service.getAll()).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns university when found', async () => {
      ctx.prisma.university.findFirst.mockResolvedValue(makeUniversity());
      const result = await ctx.service.getById('uni-1');
      expect(result.id).toBe('uni-1');
    });

    it('throws AppNotFoundException when not found', async () => {
      ctx.prisma.university.findFirst.mockResolvedValue(null);
      await expect(ctx.service.getById('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns university DTO', async () => {
      ctx.prisma.university.create.mockResolvedValue(makeUniversity());
      const result = await ctx.service.create({
        name: 'Test University',
        latitude: 6.9271,
        longitude: 79.8612,
      });
      expect(result.name).toBe('Test University');
    });

    it('throws AppBadRequestException for invalid latitude', async () => {
      await expect(
        ctx.service.create({ name: 'X', latitude: 200, longitude: 79 }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppBadRequestException for invalid longitude', async () => {
      await expect(
        ctx.service.create({ name: 'X', latitude: 6.9, longitude: 300 }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppConflictException on duplicate name', async () => {
      ctx.prisma.university.create.mockRejectedValue(new Error('unique constraint'));
      await expect(
        ctx.service.create({ name: 'Duplicate', latitude: 6.9, longitude: 79.8 }),
      ).rejects.toThrow(AppConflictException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns university DTO', async () => {
      ctx.prisma.university.findFirst.mockResolvedValue(makeUniversity());
      ctx.prisma.university.update.mockResolvedValue(makeUniversity({ name: 'Updated U' }));
      const result = await ctx.service.update('uni-1', {
        name: 'Updated U',
        latitude: 6.9,
        longitude: 79.8,
      });
      expect(result.name).toBe('Updated U');
    });

    it('throws AppNotFoundException when not found', async () => {
      ctx.prisma.university.findFirst.mockResolvedValue(null);
      await expect(
        ctx.service.update('missing', { name: 'X', latitude: 6.9, longitude: 79.8 }),
      ).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppBadRequestException for invalid coordinates on update', async () => {
      await expect(
        ctx.service.update('uni-1', { name: 'Y', latitude: -200, longitude: 79.8 }),
      ).rejects.toThrow(AppBadRequestException);
    });
  });
});
