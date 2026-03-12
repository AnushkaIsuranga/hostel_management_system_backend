import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => '123e4567-e89b-12d3-a456-426614174000'),
}));
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { existsSync } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';

import { AppBadRequestException } from '../../../src/common/exceptions/app-exception';
import { LocalImageStorageService } from '../../../src/hostels/images/local-image-storage.service';

describe('LocalImageStorageService', () => {
  let service: LocalImageStorageService;
  const configService = { cdnBaseUrl: 'https://cdn.example.com' };

  beforeEach(() => {
    service = new LocalImageStorageService(configService as any);
    vi.mocked(mkdir).mockReset();
    vi.mocked(stat).mockReset();
    vi.mocked(unlink).mockReset();
    vi.mocked(existsSync).mockReset();
  });

  it('rejects unsupported mime types', async () => {
    await expect(
      service.uploadImage({ size: 100, mimetype: 'application/pdf' } as any, 'hostel-1'),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('rejects empty file payloads', async () => {
    await expect(service.uploadImage({ size: 0, mimetype: 'image/jpeg' } as any, 'hostel-1')).rejects.toThrow(
      AppBadRequestException,
    );
  });

  it('rejects file sizes larger than 5MB', async () => {
    await expect(
      service.uploadImage({ size: 6 * 1024 * 1024, mimetype: 'image/png' } as any, 'hostel-1'),
    ).rejects.toThrow(AppBadRequestException);
  });

  it('uploads image variants and returns stored metadata', async () => {
    vi.mocked(stat).mockResolvedValue({ size: 2048 } as any);

    const result = await service.uploadImage(
      {
        size: 1024,
        mimetype: 'image/jpeg',
        buffer: Buffer.from('fake'),
      } as any,
      'hostel-1',
    );

    expect(mkdir).toHaveBeenCalled();
    expect(result.contentType).toBe('image/webp');
    expect(result.fileSize).toBe(2048);
    expect(result.imageUrl).toContain('/uploads/hostels/hostel-1/full/');
    expect(result.imageUrl.startsWith('https://cdn.example.com')).toBe(true);
  });

  it('deleteImage returns false for empty imageUrl', async () => {
    const deleted = await service.deleteImage('');
    expect(deleted).toBe(false);
  });

  it('deleteImage returns false for invalid extracted paths', async () => {
    const deleted = await service.deleteImage('not-a-rooted-path');

    expect(deleted).toBe(false);
  });

  it('deleteImage returns false when variants do not exist', async () => {
    vi.mocked(existsSync).mockReturnValue(false);

    const deleted = await service.deleteImage('/uploads/hostels/hostel-1/card/a.webp');

    expect(deleted).toBe(false);
    expect(unlink).not.toHaveBeenCalled();
  });

  it('deleteImage removes full/card/thumbnail variants when files exist', async () => {
    vi.mocked(existsSync).mockReturnValue(true);

    const deleted = await service.deleteImage('/uploads/hostels/hostel-1/full/a.webp');

    expect(deleted).toBe(true);
    expect(unlink).toHaveBeenCalledTimes(3);
  });

  it('deleteImage removes thumbnail variants using URL input', async () => {
    vi.mocked(existsSync)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const deleted = await service.deleteImage('https://cdn.example.com/uploads/hostels/hostel-1/thumbnail/z.webp');

    expect(deleted).toBe(true);
    expect(unlink).toHaveBeenCalledTimes(2);
  });
});
