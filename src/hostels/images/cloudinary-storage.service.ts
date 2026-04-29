import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';

import { AppBadRequestException } from '../../common/exceptions/app-exception';
import { AppConfigService } from '../../config/app-config.service';
import { StorageService, StoredImageResult } from './storage.interface';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  private static readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: AppConfigService) {
    const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

    if (cloudinaryUrl) {
      cloudinary.config({
        cloudinary_url: cloudinaryUrl,
      });
      return;
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary configuration is incomplete. Uploads may fail until CLOUDINARY_URL or CLOUDINARY_* variables are configured.');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  async uploadImage(file: Express.Multer.File, hostelId: string): Promise<StoredImageResult> {
    this.validateImage(file);

    const processedBuffer = await this.processImage(file.buffer, 1200);
    const storedFileName = `${randomUUID().replace(/-/g, '')}.webp`;
    const publicId = `unihome/hostels/${hostelId}/${storedFileName.replace(/\.webp$/i, '')}`;

    try {
      const uploadResult = await this.uploadBufferToCloudinary(processedBuffer, publicId);

      return {
        imageUrl: uploadResult.secure_url,
        contentType: 'image/webp',
        fileSize: processedBuffer.length,
        storedFileName,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image to Cloudinary: ${error.message}`, error.stack);
      throw new AppBadRequestException('Failed to upload image. Please try again.');
    }
  }

  async deleteImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl?.trim()) {
      return false;
    }

    const publicId = this.extractPublicId(imageUrl);
    if (!publicId) {
      this.logger.warn(`Could not extract Cloudinary public_id from URL: ${imageUrl}`);
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      });

      return result.result === 'ok' || result.result === 'not found';
    } catch (error) {
      this.logger.error(`Failed to delete image from Cloudinary: ${error.message}`, error.stack);
      return false;
    }
  }

  private validateImage(file: Express.Multer.File) {
    if (!file || file.size <= 0) {
      throw new AppBadRequestException('Image file is required.');
    }

    if (file.size > CloudinaryStorageService.MAX_IMAGE_SIZE_BYTES) {
      throw new AppBadRequestException('Image too large. Maximum allowed size is 5MB.');
    }

    if (!CloudinaryStorageService.ALLOWED_CONTENT_TYPES.has(file.mimetype)) {
      throw new AppBadRequestException('Invalid image type. Allowed types are jpeg, png, webp.');
    }
  }

  private async processImage(buffer: Buffer, width: number): Promise<Buffer> {
    return sharp(buffer)
      .rotate()
      .resize({
        width,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
  }

  private uploadBufferToCloudinary(buffer: Buffer, publicId: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: undefined,
          public_id: publicId,
          resource_type: 'image',
          overwrite: true,
          format: 'webp',
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed.'));
            return;
          }
          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }

  private extractPublicId(imageUrl: string): string | null {
    try {
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const uploadIndex = pathSegments.findIndex((segment) => segment === 'upload');

      if (uploadIndex === -1 || uploadIndex + 1 >= pathSegments.length) {
        return null;
      }

      const afterUpload = pathSegments.slice(uploadIndex + 1);

      // Skip optional transformation segment(s) and version segment like v1710000000.
      const firstAssetIndex = afterUpload.findIndex((segment) => /^v\d+$/.test(segment));
      const assetPath = firstAssetIndex >= 0 ? afterUpload.slice(firstAssetIndex + 1) : afterUpload;

      if (!assetPath.length) {
        return null;
      }

      const fileName = assetPath[assetPath.length - 1];
      const withoutExtension = fileName.replace(/\.[^.]+$/, '');
      assetPath[assetPath.length - 1] = withoutExtension;

      return assetPath.join('/');
    } catch {
      return null;
    }
  }
}