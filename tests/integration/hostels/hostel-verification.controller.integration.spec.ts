import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { HostelVerificationStatus, UserRole } from '../../../src/common/enums/app.enums';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { HostelVerificationController } from '../../../src/hostels/verification/hostel-verification.controller';
import { HostelVerificationService } from '../../../src/hostels/verification/hostel-verification.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeVerificationRequest } from '../../helpers';

describe('HostelVerificationController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelVerificationService = {
    requestVerification: vi.fn(),
    approveVerification: vi.fn(),
    rejectVerification: vi.fn(),
    getForHostel: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelVerificationController],
      providers: [
        { provide: HostelVerificationService, useValue: hostelVerificationService },
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

  it('POST /api/hostels/:hostelId/verification/request creates a request', async () => {
    hostelVerificationService.requestVerification.mockResolvedValue(makeVerificationRequest());

    const response = await ctx.client
      .post('/api/hostels/550e8400-e29b-41d4-a716-446655440000/verification/request')
      .expect(200);

    expect(hostelVerificationService.requestVerification).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-1',
    );
    expect(response.body.status).toBe(HostelVerificationStatus.Pending);
  });

  it('POST /api/verification-requests/:id/approve returns 403 for non-admin users', async () => {
    const response = await ctx.client
      .post('/api/verification-requests/550e8400-e29b-41d4-a716-446655440000/approve')
      .send({ adminNotes: 'ok' })
      .expect(403);

    expect(hostelVerificationService.approveVerification).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  it('GET /api/hostels/:hostelId/verification/requests returns current user scoped requests', async () => {
    hostelVerificationService.getForHostel.mockResolvedValue([makeVerificationRequest()]);

    const response = await ctx.client
      .get('/api/hostels/550e8400-e29b-41d4-a716-446655440000/verification/requests')
      .expect(200);

    expect(hostelVerificationService.getForHostel).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-1',
      false,
    );
    expect(response.body).toHaveLength(1);
  });
});
