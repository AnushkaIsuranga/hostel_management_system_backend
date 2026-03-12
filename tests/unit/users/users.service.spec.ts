import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsersService } from '../../../src/users/users.service';
import { UserRole } from '../../../src/common/enums/app.enums';
import {
  AppNotFoundException,
  AppConflictException,
  AppForbiddenException,
  AppBadRequestException,
} from '../../../src/common/exceptions/app-exception';
import { makeUser } from '../../helpers';

const makePrisma = () => ({
  user: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  hostel: {
    count: vi.fn(),
  },
  hostelReview: {
    count: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new UsersService(prisma as any);
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns mapped user DTOs', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()]);
      const result = await service.getAll();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('test@example.com');
    });

    it('returns empty array when no users', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      expect(await service.getAll()).toEqual([]);
    });
  });

  // ── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns user when found', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());
      const result = await service.getById('user-1');
      expect(result.id).toBe('user-1');
    });

    it('throws AppNotFoundException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── getByRole ─────────────────────────────────────────────────────────────

  describe('getByRole', () => {
    it('filters by Student role name', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser()]);
      const result = await service.getByRole('Student');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: UserRole.Student }) }),
      );
      expect(result).toHaveLength(1);
    });

    it('filters by numeric role "1" (Owner)', async () => {
      prisma.user.findMany.mockResolvedValue([makeUser({ role: UserRole.Owner })]);
      await service.getByRole('1');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: UserRole.Owner }) }),
      );
    });

    it('is case-insensitive for role name', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      await service.getByRole('ADMIN');
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: UserRole.Admin }) }),
      );
    });

    it('throws AppBadRequestException for unknown role', async () => {
      await expect(service.getByRole('superadmin')).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppBadRequestException for out-of-range numeric role', async () => {
      await expect(service.getByRole('99')).rejects.toThrow(AppBadRequestException);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates and returns user DTO', async () => {
      const user = makeUser();
      prisma.user.create.mockResolvedValue(user);
      const result = await service.create({
        fullName: 'Alice',
        email: 'test@example.com',
        phoneNumber: '0771234567',
        role: UserRole.Student,
      });
      expect(result.email).toBe('test@example.com');
    });

    it('throws AppConflictException on duplicate email', async () => {
      prisma.user.create.mockRejectedValue(new Error('unique constraint'));
      await expect(
        service.create({ fullName: 'X', email: 'dup@test.com', phoneNumber: '', role: UserRole.Student }),
      ).rejects.toThrow(AppConflictException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates and returns user DTO', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser());
      prisma.user.update.mockResolvedValue(makeUser({ fullName: 'Updated' }));
      const result = await service.update('user-1', {
        fullName: 'Updated',
        phoneNumber: '0779999999',
        role: UserRole.Student,
      });
      expect(result.fullName).toBe('Updated');
    });

    it('throws AppNotFoundException when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.update('missing', { fullName: 'X', phoneNumber: '', role: UserRole.Student }),
      ).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes own profile for non-admin', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: 'user-1' }));
      prisma.user.update.mockResolvedValue({});
      await service.delete('user-1', 'user-1', false);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('throws AppNotFoundException for non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.delete('missing', 'requester', true)).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppForbiddenException when non-admin tries to delete another user', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: 'other-user' }));
      await expect(service.delete('other-user', 'user-1', false)).rejects.toThrow(AppForbiddenException);
    });

    it('allows admin to delete any user', async () => {
      prisma.user.findFirst.mockResolvedValue(makeUser({ id: 'other-user' }));
      prisma.user.update.mockResolvedValue({});
      await service.delete('other-user', 'admin-id', true);
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns totals and 7-day counts for hostels, users, reviews', async () => {
      prisma.$transaction.mockResolvedValue([10, 2, 50, 5, 30, 3]);
      const result = await service.getStats();
      expect(result.hostels.totalCount).toBe(10);
      expect(result.hostels.last7DaysCount).toBe(2);
      expect(result.users.totalCount).toBe(50);
      expect(result.users.last7DaysCount).toBe(5);
      expect(result.reviews.totalCount).toBe(30);
      expect(result.reviews.last7DaysCount).toBe(3);
    });
  });
});
