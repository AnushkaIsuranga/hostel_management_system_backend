import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HostelVerificationService } from '../../../src/hostels/verification/hostel-verification.service';
import { HostelVerificationStatus } from '../../../src/common/enums/app.enums';
import {
  AppNotFoundException,
  AppConflictException,
  AppForbiddenException,
  AppBadRequestException,
} from '../../../src/common/exceptions/app-exception';
import { makeHostel, makeVerificationRequest } from '../../helpers';

const makePrisma = () => ({
  hostel: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  hostelVerificationRequest: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('HostelVerificationService', () => {
  let service: HostelVerificationService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new HostelVerificationService(prisma as any);
  });

  // ── requestVerification ───────────────────────────────────────────────────

  describe('requestVerification', () => {
    it('creates a verification request', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(null);
      const created = makeVerificationRequest();
      prisma.$transaction.mockImplementation(async (fn: (p: any) => Promise<any>) => {
        return fn({
          hostelVerificationRequest: { create: vi.fn().mockResolvedValue(created) },
          hostel: { update: vi.fn().mockResolvedValue({}) },
        });
      });
      const result = await service.requestVerification('hostel-1', 'user-1');
      expect(result.hostelId).toBe('hostel-1');
    });

    it('throws AppForbiddenException when hostel not found for that owner', async () => {
      prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(service.requestVerification('hostel-1', 'other-user')).rejects.toThrow(AppForbiddenException);
    });

    it('throws AppConflictException when a pending request already exists', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(makeVerificationRequest());
      await expect(service.requestVerification('hostel-1', 'user-1')).rejects.toThrow(AppConflictException);
    });
  });

  // ── approveVerification ───────────────────────────────────────────────────

  describe('approveVerification', () => {
    it('approves a pending request', async () => {
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(makeVerificationRequest());
      const approved = makeVerificationRequest({ status: HostelVerificationStatus.Approved });
      prisma.$transaction.mockImplementation(async (fn: (p: any) => Promise<any>) => {
        return fn({
          hostelVerificationRequest: { update: vi.fn().mockResolvedValue(approved) },
          hostel: { update: vi.fn().mockResolvedValue({}) },
        });
      });
      const result = await service.approveVerification('req-1', 'admin-1', null);
      expect(result.status).toBe(HostelVerificationStatus.Approved);
    });

    it('throws AppNotFoundException when request not found', async () => {
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(null);
      await expect(service.approveVerification('missing', 'admin-1')).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppBadRequestException when request is not pending', async () => {
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(
        makeVerificationRequest({ status: HostelVerificationStatus.Approved }),
      );
      await expect(service.approveVerification('req-1', 'admin-1')).rejects.toThrow(AppBadRequestException);
    });
  });

  // ── rejectVerification ────────────────────────────────────────────────────

  describe('rejectVerification', () => {
    it('rejects a pending request', async () => {
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(makeVerificationRequest());
      const rejected = makeVerificationRequest({ status: HostelVerificationStatus.Rejected });
      prisma.$transaction.mockImplementation(async (fn: (p: any) => Promise<any>) => {
        return fn({
          hostelVerificationRequest: { update: vi.fn().mockResolvedValue(rejected) },
          hostel: { update: vi.fn().mockResolvedValue({}) },
        });
      });
      const result = await service.rejectVerification('req-1', 'admin-1', 'Insufficient documentation');
      expect(result.status).toBe(HostelVerificationStatus.Rejected);
    });

    it('throws AppNotFoundException when request not found', async () => {
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(null);
      await expect(service.rejectVerification('missing', 'admin-1')).rejects.toThrow(AppNotFoundException);
    });

    it('throws AppBadRequestException when request is not pending', async () => {
      prisma.hostelVerificationRequest.findFirst.mockResolvedValue(
        makeVerificationRequest({ status: HostelVerificationStatus.Rejected }),
      );
      await expect(service.rejectVerification('req-1', 'admin-1')).rejects.toThrow(AppBadRequestException);
    });
  });

  // ── getForHostel ──────────────────────────────────────────────────────────

  describe('getForHostel', () => {
    it('returns requests for admin without ownership check', async () => {
      prisma.hostelVerificationRequest.findMany.mockResolvedValue([makeVerificationRequest()]);
      const result = await service.getForHostel('hostel-1', 'admin-1', true);
      expect(result).toHaveLength(1);
    });

    it('returns requests for the hostel owner', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelVerificationRequest.findMany.mockResolvedValue([makeVerificationRequest()]);
      const result = await service.getForHostel('hostel-1', 'user-1', false);
      expect(result).toHaveLength(1);
    });

    it('throws AppForbiddenException for non-owner, non-admin', async () => {
      prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(service.getForHostel('hostel-1', 'stranger', false)).rejects.toThrow(AppForbiddenException);
    });
  });
});
