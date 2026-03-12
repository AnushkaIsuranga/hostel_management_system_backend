import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../src/common/enums/app.enums';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { HostelReviewsController } from '../../../src/hostels/reviews/hostel-reviews.controller';
import { HostelReviewsService } from '../../../src/hostels/reviews/hostel-reviews.service';
import {
  createIntegrationHttpApp,
  IntegrationHttpContext,
  makeHostelReview,
} from '../../helpers';

describe('HostelReviewsController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelReviewsService = {
    getForHostel: vi.fn(),
    getSummary: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelReviewsController],
      providers: [
        { provide: HostelReviewsService, useValue: hostelReviewsService },
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

  it('GET /api/hostels/:hostelId/reviews returns reviews', async () => {
    hostelReviewsService.getForHostel.mockResolvedValue([makeHostelReview()]);

    const response = await ctx.client
      .get('/api/hostels/550e8400-e29b-41d4-a716-446655440000/reviews')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].rating).toBe(4);
  });

  it('POST /api/hostels/:hostelId/reviews creates review with current user', async () => {
    hostelReviewsService.create.mockResolvedValue(makeHostelReview({ id: 'review-2' }));

    const response = await ctx.client
      .post('/api/hostels/550e8400-e29b-41d4-a716-446655440000/reviews')
      .send({ rating: 5, comment: 'Excellent' })
      .expect(201);

    expect(hostelReviewsService.create).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'user-1',
      expect.objectContaining({ rating: 5 }),
    );
    expect(response.body.id).toBe('review-2');
  });

  it('PUT /api/hostels/:hostelId/reviews/:reviewId validates UUID path params', async () => {
    const response = await ctx.client
      .put('/api/hostels/not-a-uuid/reviews/also-not-a-uuid')
      .send({ rating: 3 })
      .expect(400);

    expect(hostelReviewsService.update).not.toHaveBeenCalled();
    expect(response.headers['content-type']).toContain('application/problem+json');
  });
});
