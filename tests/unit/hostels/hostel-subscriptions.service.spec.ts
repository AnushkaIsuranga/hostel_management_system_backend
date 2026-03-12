import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { HostelSubscriptionsService } from '../../../src/hostels/subscriptions/hostel-subscriptions.service';
import { HostelVerificationStatus } from '../../../src/common/enums/app.enums';
import { AppBadRequestException, AppForbiddenException, AppNotFoundException } from '../../../src/common/exceptions/app-exception';
import { makeHostel, makeSubscription, silenceNestLogger } from '../../helpers';

const makePrisma = () => ({
  hostel: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
  hostelSubscription: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('HostelSubscriptionsService', () => {
  let service: HostelSubscriptionsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeAll(() => silenceNestLogger());

  beforeEach(() => {
    prisma = makePrisma();
    service = new HostelSubscriptionsService(prisma as any);
  });

  // ── upsert ────────────────────────────────────────────────────────────────

  describe('upsert', () => {
    const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
    const startDate = new Date().toISOString();

    it('throws AppBadRequestException when expiryDate <= startDate', async () => {
      await expect(
        service.upsert('hostel-1', 'user-1', false, {
          startDate: futureDate,
          expiryDate: startDate,
        }),
      ).rejects.toThrow(AppBadRequestException);
    });

    it('throws AppNotFoundException when hostel is not found for that user', async () => {
      prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(
        service.upsert('hostel-1', 'other-user', false, {
          startDate,
          expiryDate: futureDate,
        }),
      ).rejects.toThrow(AppNotFoundException);
    });

    it('creates a new subscription when none exists', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelSubscription.findFirst.mockResolvedValue(null);
      const sub = makeSubscription({ startDate: new Date(startDate), expiryDate: new Date(futureDate) });
      prisma.hostelSubscription.create.mockResolvedValue(sub);
      prisma.hostel.update.mockResolvedValue({});

      const result = await service.upsert('hostel-1', 'user-1', false, { startDate, expiryDate: futureDate });
      expect(result.hostelId).toBe('hostel-1');
      expect(prisma.hostelSubscription.create).toHaveBeenCalledOnce();
    });

    it('updates an existing subscription', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelSubscription.findFirst.mockResolvedValue(makeSubscription());
      const updated = makeSubscription({ startDate: new Date(startDate), expiryDate: new Date(futureDate) });
      prisma.hostelSubscription.update.mockResolvedValue(updated);
      prisma.hostel.update.mockResolvedValue({});

      const result = await service.upsert('hostel-1', 'user-1', false, { startDate, expiryDate: futureDate });
      expect(result.hostelId).toBe('hostel-1');
      expect(prisma.hostelSubscription.update).toHaveBeenCalledOnce();
    });

    it('throws forbidden when actor is not owner and not admin', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel({ ownerId: 'owner-1' }));

      await expect(
        service.upsert('hostel-1', 'stranger', false, {
          startDate,
          expiryDate: futureDate,
        }),
      ).rejects.toThrow(AppForbiddenException);
    });

    it('marks hostel as expired when upserted subscription is already expired', async () => {
      const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const pastExpiry = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      prisma.hostel.findFirst.mockResolvedValue(makeHostel({ verificationStatus: HostelVerificationStatus.Approved }));
      prisma.hostelSubscription.findFirst.mockResolvedValue(null);
      prisma.hostelSubscription.create.mockResolvedValue(
        makeSubscription({
          startDate: new Date(pastStart),
          expiryDate: new Date(pastExpiry),
          isActive: false,
        }),
      );
      prisma.hostel.update.mockResolvedValue({});

      await service.upsert('hostel-1', 'user-1', false, { startDate: pastStart, expiryDate: pastExpiry });

      expect(prisma.hostel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isVerified: false,
            verificationStatus: HostelVerificationStatus.Expired,
          }),
        }),
      );
    });

    it('moves verification from expired to pending when renewed', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel({ verificationStatus: HostelVerificationStatus.Expired }));
      prisma.hostelSubscription.findFirst.mockResolvedValue(makeSubscription());
      prisma.hostelSubscription.update.mockResolvedValue(
        makeSubscription({ startDate: new Date(startDate), expiryDate: new Date(futureDate), isActive: true }),
      );
      prisma.hostel.update.mockResolvedValue({});

      await service.upsert('hostel-1', 'user-1', false, { startDate, expiryDate: futureDate });

      expect(prisma.hostel.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ verificationStatus: HostelVerificationStatus.Pending }),
        }),
      );
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('returns a subscription when found', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelSubscription.findFirst.mockResolvedValue(makeSubscription());

      const result = await service.get('hostel-1', 'user-1', false);
      expect(result).not.toBeNull();
      expect(result!.hostelId).toBe('hostel-1');
    });

    it('returns null when no subscription exists', async () => {
      prisma.hostel.findFirst.mockResolvedValue(makeHostel());
      prisma.hostelSubscription.findFirst.mockResolvedValue(null);

      const result = await service.get('hostel-1', 'user-1', false);
      expect(result).toBeNull();
    });

    it('throws AppNotFoundException when hostel is not found', async () => {
      prisma.hostel.findFirst.mockResolvedValue(null);
      await expect(service.get('hostel-1', 'stranger', false)).rejects.toThrow(AppNotFoundException);
    });
  });

  // ── processExpirationsAndReminders ───────────────────────────────────────

  describe('processExpirationsAndReminders', () => {
    it('processes expired subscriptions', async () => {
      const expiredSub = makeSubscription({
        isActive: true,
        expiryDate: new Date(Date.now() - 1000),
        hostel: makeHostel({ ownerId: 'user-1' }),
      });
      prisma.hostelSubscription.findMany
        .mockResolvedValueOnce([expiredSub])
        .mockResolvedValueOnce([]);
      prisma.$transaction.mockResolvedValue([]);
      prisma.hostelSubscription.update.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1', email: 'owner@test.com' });

      await service.processExpirationsAndReminders();
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('does nothing when there are no expired or upcoming subscriptions', async () => {
      prisma.hostelSubscription.findMany.mockResolvedValue([]);

      await service.processExpirationsAndReminders();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('sends reminder and updates lastReminderSentAt for upcoming subscriptions', async () => {
      const upcoming = makeSubscription({
        isActive: true,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastReminderSentAt: null,
        hostel: makeHostel({ ownerId: 'user-1' }),
      });
      prisma.hostelSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([upcoming]);
      prisma.hostelSubscription.update.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ email: 'owner@test.com' });

      await service.processExpirationsAndReminders();

      expect(prisma.hostelSubscription.update).toHaveBeenCalled();
    });

    it('skips reminder when already sent on same date', async () => {
      const now = new Date();
      const upcoming = makeSubscription({
        isActive: true,
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        lastReminderSentAt: new Date(now),
        hostel: makeHostel({ ownerId: 'user-1' }),
      });
      prisma.hostelSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([upcoming]);

      await service.processExpirationsAndReminders();

      expect(prisma.hostelSubscription.update).not.toHaveBeenCalled();
    });

    it('handles missing owner email for reminder notification path', async () => {
      const upcoming = makeSubscription({
        isActive: true,
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        lastReminderSentAt: null,
        hostel: makeHostel({ ownerId: 'user-1' }),
      });
      prisma.hostelSubscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([upcoming]);
      prisma.hostelSubscription.update.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ email: null });

      await service.processExpirationsAndReminders();

      expect(prisma.hostelSubscription.update).toHaveBeenCalled();
    });
  });
});
