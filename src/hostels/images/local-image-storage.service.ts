import { mkdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { AppBadRequestException } from '../../common/exceptions/app-exception';
import { AppConfigService } from '../../config/app-config.service';

export interface StoredImageResult {
  imageUrl: string;
  contentType: string;
  fileSize: number;
  storedFileName: string;
}

@Injectable()
export class LocalImageStorageService {
  private static readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  constructor(private readonly configService: AppConfigService) {}

  async uploadImage(file: Express.Multer.File, hostelId: string): Promise<StoredImageResult> {
    this.validateImage(file);

    const hostelFolder = join(process.cwd(), 'wwwroot', 'uploads', 'hostels', hostelId);
    const thumbnailFolder = join(hostelFolder, 'thumbnail');
    const cardFolder = join(hostelFolder, 'card');
    const fullFolder = join(hostelFolder, 'full');

    await Promise.all([
      mkdir(thumbnailFolder, { recursive: true }),
      mkdir(cardFolder, { recursive: true }),
      mkdir(fullFolder, { recursive: true }),
    ]);

    const storedFileName = `${randomUUID().replace(/-/g, '')}.webp`;
    const thumbnailPath = join(thumbnailFolder, storedFileName);
    const cardPath = join(cardFolder, storedFileName);
    const fullPath = join(fullFolder, storedFileName);

    await Promise.all([
      this.saveResized(file.buffer, 300, thumbnailPath),
      this.saveResized(file.buffer, 600, cardPath),
      this.saveResized(file.buffer, 1200, fullPath),
    ]);

    const fullStat = await stat(fullPath);
    const relativePath = `/uploads/hostels/${hostelId}/full/${storedFileName}`;

    return {
      imageUrl: this.buildPublicUrl(relativePath),
      contentType: 'image/webp',
      fileSize: fullStat.size,
      storedFileName,
    };
  }

  async deleteImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl?.trim()) {
      return false;
    }

    const imagePath = this.extractPath(imageUrl);
    if (!imagePath || !imagePath.startsWith('/')) {
      return false;
    }

    const webRoot = join(process.cwd(), 'wwwroot');
    let deleted = false;

    for (const relativePath of this.getVariantRelativePaths(imagePath)) {
      const fullPath = join(webRoot, relativePath.replace(/^\//, '').replaceAll('/', '\\'));
      if (!existsSync(fullPath)) {
        continue;
      }

      await unlink(fullPath);
      deleted = true;
    }

    return deleted;
  }

  private validateImage(file: Express.Multer.File) {
    if (!file || file.size <= 0) {
      throw new AppBadRequestException('Image file is required.');
    }

    if (file.size > LocalImageStorageService.MAX_IMAGE_SIZE_BYTES) {
      throw new AppBadRequestException('Image too large. Maximum allowed size is 5MB.');
    }

    if (!LocalImageStorageService.ALLOWED_CONTENT_TYPES.has(file.mimetype)) {
      throw new AppBadRequestException('Invalid image type. Allowed types are jpeg, png, webp.');
    }
  }

  private async saveResized(buffer: Buffer, width: number, outputPath: string) {
    await sharp(buffer)
      .rotate()
      .resize({
        width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(outputPath);
  }

  private buildPublicUrl(relativePath: string) {
    return this.configService.cdnBaseUrl
      ? `${this.configService.cdnBaseUrl.replace(/\/$/, '')}${relativePath}`
      : relativePath;
  }

  private extractPath(imageUrl: string) {
    try {
      return new URL(imageUrl).pathname;
    } catch {
      return imageUrl;
    }
  }

  private *getVariantRelativePaths(imagePath: string) {
    if (imagePath.includes('/full/')) {
      yield imagePath;
      yield imagePath.replace('/full/', '/card/');
      yield imagePath.replace('/full/', '/thumbnail/');
      return;
    }

    if (imagePath.includes('/card/')) {
      yield imagePath;
      yield imagePath.replace('/card/', '/full/');
      yield imagePath.replace('/card/', '/thumbnail/');
      return;
    }

    if (imagePath.includes('/thumbnail/')) {
      yield imagePath;
      yield imagePath.replace('/thumbnail/', '/full/');
      yield imagePath.replace('/thumbnail/', '/card/');
      return;
    }

    yield imagePath;
  }
}
