import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../../src/common/enums/app.enums';
import { JwtAuthGuard } from '../../../src/common/guards/jwt-auth.guard';
import { HostelImagesController } from '../../../src/hostels/images/hostel-images.controller';
import { HostelImagesService } from '../../../src/hostels/images/hostel-images.service';
import { createIntegrationHttpApp, IntegrationHttpContext, makeHostelImage } from '../../helpers';

describe('HostelImagesController Integration', () => {
  let ctx: IntegrationHttpContext;
  const hostelImagesService = {
    getImagesByHostelId: vi.fn(),
    addImage: vi.fn(),
    deleteImage: vi.fn(),
    updateImageOrder: vi.fn(),
  };

  beforeAll(async () => {
    ctx = await createIntegrationHttpApp({
      controllers: [HostelImagesController],
      providers: [
        { provide: HostelImagesService, useValue: hostelImagesService },
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

  it('GET /api/hostelimages/:hostelId returns images', async () => {
    hostelImagesService.getImagesByHostelId.mockResolvedValue([makeHostelImage()]);

    const response = await ctx.client.get('/api/hostelimages/550e8400-e29b-41d4-a716-446655440000').expect(200);

    expect(hostelImagesService.getImagesByHostelId).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
    expect(response.body).toHaveLength(1);
  });

  it('POST /api/hostelimages/:hostelId uploads image', async () => {
    hostelImagesService.addImage.mockResolvedValue(makeHostelImage({ id: 'image-2' }));

    const response = await ctx.client
      .post('/api/hostelimages/550e8400-e29b-41d4-a716-446655440000')
      .field('displayOrder', '2')
      .attach('file', Buffer.from('fake-image-data'), 'test.jpg')
      .expect(200);

    expect(hostelImagesService.addImage).toHaveBeenCalled();
    expect(response.body.id).toBe('image-2');
  });

  it('PUT /api/hostelimages/:imageId/order updates image order and returns 204', async () => {
    hostelImagesService.updateImageOrder.mockResolvedValue(undefined);

    await ctx.client
      .put('/api/hostelimages/550e8400-e29b-41d4-a716-446655440000/order')
      .send({ displayOrder: 3 })
      .expect(204);

    expect(hostelImagesService.updateImageOrder).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      3,
      'user-1',
      false,
    );
  });
});
