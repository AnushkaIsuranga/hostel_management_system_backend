import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from '../../../src/common/exceptions/app-exception';
import { HostelImagesService } from '../../../src/hostels/images/hostel-images.service';

const makePrisma = () => ({
  hostel: {
    findFirst: vi.fn(),
  },
  hostelImage: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
});

const makeStorage = () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
});

const makeImage = (overrides: Partial<any> = {}) => ({
  id: 'image-1',
  hostelId: 'hostel-1',
  fileName: 'a.webp',
  contentType: 'image/webp',
  fileSize: BigInt(1024),
  imageUrl: '/uploads/hostels/hostel-1/full/a.webp',
  displayOrder: 0,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

describe('HostelImagesService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let storage: ReturnType<typeof makeStorage>;
  let service: HostelImagesService;

  beforeEach(() => {
    prisma = makePrisma();
    storage = makeStorage();
    service = new HostelImagesService(prisma as any, storage as any);
  });

  it('getImagesByHostelId returns mapped DTOs', async () => {
    prisma.hostelImage.findMany.mockResolvedValue([makeImage()]);

    const result = await service.getImagesByHostelId('hostel-1');

    expect(result).toHaveLength(1);
    expect(result[0].fileSize).toBe(1024);
  });

  it('addImage throws when hostel not found', async () => {
    prisma.hostel.findFirst.mockResolvedValue(null);

    await expect(service.addImage('hostel-1', {} as any, undefined, 'user-1', false)).rejects.toThrow(AppNotFoundException);
  });

  it('addImage throws when user is not owner', async () => {
    prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', ownerId: 'owner-1' });

    await expect(service.addImage('hostel-1', {} as any, undefined, 'user-1', false)).rejects.toThrow(AppForbiddenException);
  });

  it('addImage enforces max image count', async () => {
    prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', ownerId: 'user-1' });
    prisma.hostelImage.count.mockResolvedValue(8);

    await expect(service.addImage('hostel-1', {} as any, undefined, 'user-1', false)).rejects.toThrow(AppBadRequestException);
  });

  it('addImage stores and persists image metadata', async () => {
    prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', ownerId: 'user-1' });
    prisma.hostelImage.count.mockResolvedValue(1);
    storage.uploadImage.mockResolvedValue({
      imageUrl: '/uploads/hostels/hostel-1/full/a.webp',
      storedFileName: 'a.webp',
      contentType: 'image/webp',
      fileSize: 222,
    });
    prisma.hostelImage.create.mockResolvedValue(makeImage({ fileSize: BigInt(222) }));

    const result = await service.addImage('hostel-1', { buffer: Buffer.from('x') } as any, 3, 'user-1', false);

    expect(prisma.hostelImage.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ displayOrder: 3 }) }),
    );
    expect(result.fileSize).toBe(222);
  });

  it('addImage allows admins even if they are not owners', async () => {
    prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', ownerId: 'owner-1' });
    prisma.hostelImage.count.mockResolvedValue(0);
    storage.uploadImage.mockResolvedValue({
      imageUrl: '/uploads/hostels/hostel-1/full/admin.webp',
      storedFileName: 'admin.webp',
      contentType: 'image/webp',
      fileSize: 100,
    });
    prisma.hostelImage.create.mockResolvedValue(makeImage({ fileName: 'admin.webp', fileSize: BigInt(100) }));

    const result = await service.addImage('hostel-1', { buffer: Buffer.from('x') } as any, undefined, 'admin-1', true);

    expect(result.fileName).toBe('admin.webp');
  });

  it('addImage deletes stored file when db create fails', async () => {
    prisma.hostel.findFirst.mockResolvedValue({ id: 'hostel-1', ownerId: 'user-1' });
    prisma.hostelImage.count.mockResolvedValue(0);
    storage.uploadImage.mockResolvedValue({
      imageUrl: '/uploads/hostels/hostel-1/full/b.webp',
      storedFileName: 'b.webp',
      contentType: 'image/webp',
      fileSize: 111,
    });
    prisma.hostelImage.create.mockRejectedValue(new Error('db write failed'));

    await expect(
      service.addImage('hostel-1', { buffer: Buffer.from('x') } as any, 0, 'user-1', false),
    ).rejects.toThrow('db write failed');
    expect(storage.deleteImage).toHaveBeenCalledWith('/uploads/hostels/hostel-1/full/b.webp');
  });

  it('deleteImage soft deletes image', async () => {
    prisma.hostelImage.findFirst.mockResolvedValue({ ...makeImage(), hostel: { ownerId: 'user-1' } });
    storage.deleteImage.mockResolvedValue(true);
    prisma.hostelImage.update.mockResolvedValue({});

    await service.deleteImage('image-1', 'user-1', false);

    expect(prisma.hostelImage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDeleted: true }) }),
    );
  });

  it('deleteImage throws when image not found', async () => {
    prisma.hostelImage.findFirst.mockResolvedValue(null);

    await expect(service.deleteImage('missing', 'user-1', false)).rejects.toThrow(AppNotFoundException);
  });

  it('deleteImage throws when non-owner tries deleting', async () => {
    prisma.hostelImage.findFirst.mockResolvedValue({ ...makeImage(), hostel: { ownerId: 'owner-1' } });

    await expect(service.deleteImage('image-1', 'user-1', false)).rejects.toThrow(AppForbiddenException);
  });

  it('updateImageOrder validates non-negative order', async () => {
    await expect(service.updateImageOrder('image-1', -1, 'user-1', false)).rejects.toThrow(AppBadRequestException);
  });

  it('updateImageOrder throws when image is missing', async () => {
    prisma.hostelImage.findFirst.mockResolvedValue(null);

    await expect(service.updateImageOrder('missing', 1, 'user-1', false)).rejects.toThrow(AppNotFoundException);
  });

  it('updateImageOrder throws when non-owner tries reordering', async () => {
    prisma.hostelImage.findFirst.mockResolvedValue({ ...makeImage(), hostel: { ownerId: 'owner-1' } });

    await expect(service.updateImageOrder('image-1', 2, 'user-1', false)).rejects.toThrow(AppForbiddenException);
  });

  it('updateImageOrder updates display order for owner', async () => {
    prisma.hostelImage.findFirst.mockResolvedValue({ ...makeImage(), hostel: { ownerId: 'user-1' } });
    prisma.hostelImage.update.mockResolvedValue({});

    await service.updateImageOrder('image-1', 2, 'user-1', false);

    expect(prisma.hostelImage.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ displayOrder: 2 }) }),
    );
  });

  it('deleteImageByUrl delegates to storage service', async () => {
    storage.deleteImage.mockResolvedValue(true);

    await service.deleteImageByUrl('/uploads/hostels/hostel-1/full/a.webp');

    expect(storage.deleteImage).toHaveBeenCalledWith('/uploads/hostels/hostel-1/full/a.webp');
  });
});
