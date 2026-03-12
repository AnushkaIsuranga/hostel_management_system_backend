import { describe, it, expect, vi } from 'vitest';
import { RoomsService } from '../../../src/rooms/rooms.service';
import {
  AppNotFoundException,
  AppConflictException,
} from '../../../src/common/exceptions/app-exception';
import { withServiceHarness } from '../../helpers';

const makePrisma = () => ({
  room: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

const makeRoom = (overrides: Partial<any> = {}) => ({
  id: 'room-1',
  hostelId: 'hostel-1',
  roomType: 'Single',
  price: { valueOf: () => 5000, toString: () => '5000' },
  capacity: 1,
  isAvailable: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('RoomsService', () => {
  const ctx = withServiceHarness(
    () => makePrisma(),
    (p) => new RoomsService(p as any),
  );

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped room DTOs', async () => {
      ctx.prisma.room.findMany.mockResolvedValue([makeRoom()]);
      const result = await ctx.service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].roomType).toBe('Single');
    });

    it('returns empty array when no rooms', async () => {
      ctx.prisma.room.findMany.mockResolvedValue([]);
      expect(await ctx.service.getAll()).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns room when found', async () => {
      ctx.prisma.room.findFirst.mockResolvedValue(makeRoom());
      const result = await ctx.service.getById('room-1');
      expect(result.id).toBe('room-1');
    });

    it('throws AppNotFoundException when not found', async () => {
      ctx.prisma.room.findFirst.mockResolvedValue(null);
      await expect(ctx.service.getById('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns room DTO', async () => {
      ctx.prisma.room.create.mockResolvedValue(makeRoom());
      const result = await ctx.service.create({
        hostelId: 'hostel-1',
        roomType: 'Single',
        price: 5000,
        capacity: 1,
        isAvailable: true,
      });
      expect(result.hostelId).toBe('hostel-1');
    });

    it('throws AppConflictException on duplicate', async () => {
      ctx.prisma.room.create.mockRejectedValue(new Error('unique constraint'));
      await expect(
        ctx.service.create({ hostelId: 'h', roomType: 'Single', price: 1000, capacity: 1, isAvailable: true }),
      ).rejects.toThrow(AppConflictException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns room DTO', async () => {
      ctx.prisma.room.findFirst.mockResolvedValue(makeRoom());
      ctx.prisma.room.update.mockResolvedValue(makeRoom({ roomType: 'Double' }));
      const result = await ctx.service.update('room-1', {
        roomType: 'Double',
        price: 8000,
        capacity: 2,
        isAvailable: false,
      });
      expect(result.roomType).toBe('Double');
    });

    it('throws AppNotFoundException when room not found', async () => {
      ctx.prisma.room.findFirst.mockResolvedValue(null);
      await expect(
        ctx.service.update('missing', { roomType: 'Double', price: 1000, capacity: 2, isAvailable: false }),
      ).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes a room', async () => {
      ctx.prisma.room.findFirst.mockResolvedValue(makeRoom());
      ctx.prisma.room.update.mockResolvedValue({});
      await ctx.service.delete('room-1');
      expect(ctx.prisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
      );
    });

    it('throws AppNotFoundException when room not found', async () => {
      ctx.prisma.room.findFirst.mockResolvedValue(null);
      await expect(ctx.service.delete('missing')).rejects.toThrow(AppNotFoundException);
    });
  });
});
