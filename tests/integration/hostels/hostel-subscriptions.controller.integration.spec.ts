import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../src/common/enums/app.enums';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { HostelSubscriptionsController } from '../../../src/hostels/subscriptions/hostel-subscriptions.controller';
import { HostelSubscriptionsService } from '../../../src/hostels/subscriptions/hostel-subscriptions.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeSubscription } from '../../helpers';

describe('HostelSubscriptionsController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelSubscriptionsService = {
    get: vi.fn(),
    upsert: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelSubscriptionsController],
      providers: [
        { provide: HostelSubscriptionsService, useValue: hostelSubscriptionsService },
      ],
      guardOverrides: [{ guard: JwtAuthGuard, useValue: { canActivate: () => true } }],
      currentUser: { userId: 'user-1', role: UserRole.Student },
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/hostels/:hostelId/subscription returns active subscription', async () => {
    hostelSubscriptionsService.get.mockResolvedValue(makeSubscription());

    const response = await ctx.client
      .get('/api/hostels/550e8400-e29b-41d4-a716-446655440000/subscription')
      .expect(200);

    expect(hostelSubscriptionsService.get).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-1',
      false,
    );
    expect(response.body.hostelId).toBe('hostel-1');
  });

  it('GET /api/hostels/:hostelId/subscription returns RFC7807 when subscription is missing', async () => {
    hostelSubscriptionsService.get.mockResolvedValue(null);

    const response = await ctx.client
      .get('/api/hostels/550e8400-e29b-41d4-a716-446655440000/subscription')
      .expect(404);

    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body.detail).toBe('Subscription not found.');
  });

  it('PUT /api/hostels/:hostelId/subscription upserts subscription', async () => {
    hostelSubscriptionsService.upsert.mockResolvedValue(makeSubscription({ id: 'subscription-2' }));

    const response = await ctx.client
      .put('/api/hostels/550e8400-e29b-41d4-a716-446655440000/subscription')
      .send({ startDate: '2025-01-01T00:00:00.000Z', expiryDate: '2025-12-31T00:00:00.000Z' })
      .expect(200);

    expect(hostelSubscriptionsService.upsert).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-1',
      false,
      expect.objectContaining({ startDate: '2025-01-01T00:00:00.000Z' }),
    );
    expect(response.body.id).toBe('subscription-2');
  });
});
