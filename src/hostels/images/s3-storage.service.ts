import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { AppBadRequestException } from '../../common/exceptions/app-exception';
import { AppConfigService } from '../../config/app-config.service';
import { StorageService, StoredImageResult } from './storage.interface';

@Injectable()
export class S3StorageService implements StorageService {
  private static readonly MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  private static readonly ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

  private readonly logger = new Logger(S3StorageService.name);
  private s3Client: S3Client;

  constructor(private readonly configService: AppConfigService) {
    const awsRegion = process.env.AWS_REGION || 'us-east-1';
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      this.logger.warn('AWS credentials not fully configured. S3 storage may fail.');
    }

    this.s3Client = new S3Client({
      region: awsRegion,
      ...(awsAccessKeyId &&
        awsSecretAccessKey && {
          credentials: {
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey,
          },
        }),
    });
  }

  async uploadImage(file: Express.Multer.File, hostelId: string): Promise<StoredImageResult> {
    this.validateImage(file);

    const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
    if (!bucket) {
      throw new AppBadRequestException('AWS_S3_BUCKET (or AWS_BUCKET) environment variable is not configured.');
    }

    // Process image to full size variant (1200px max width)
    const processedBuffer = await this.processImage(file.buffer, 1200);
    const storedFileName = `${randomUUID().replace(/-/g, '')}.webp`;
    const s3Key = `uploads/hostels/${hostelId}/full/${storedFileName}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: processedBuffer,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000', // 1 year cache
        }),
      );

      const imageUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;

      return {
        imageUrl,
        contentType: 'image/webp',
        fileSize: processedBuffer.length,
        storedFileName,
      };
    } catch (error) {
      this.logger.error(`Failed to upload image to S3: ${error.message}`, error.stack);
      throw new AppBadRequestException('Failed to upload image. Please try again.');
    }
  }

  async deleteImage(imageUrl: string): Promise<boolean> {
    if (!imageUrl?.trim()) {
      return false;
    }

    const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET;
    if (!bucket) {
      this.logger.warn('AWS_S3_BUCKET/AWS_BUCKET not configured. Cannot delete image.');
      return false;
    }

    try {
      // Extract S3 key from URL
      // URL format: https://bucket.s3.region.amazonaws.com/uploads/hostels/hostelId/full/fileName.webp
      const s3Key = this.extractS3Key(imageUrl, bucket);
      if (!s3Key) {
        this.logger.warn(`Could not extract S3 key from URL: ${imageUrl}`);
        return false;
      }

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: s3Key,
        }),
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete image from S3: ${error.message}`, error.stack);
      return false;
    }
  }

  private validateImage(file: Express.Multer.File) {
    if (!file || file.size <= 0) {
      throw new AppBadRequestException('Image file is required.');
    }

    if (file.size > S3StorageService.MAX_IMAGE_SIZE_BYTES) {
      throw new AppBadRequestException('Image too large. Maximum allowed size is 5MB.');
    }

    if (!S3StorageService.ALLOWED_CONTENT_TYPES.has(file.mimetype)) {
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

  private extractS3Key(imageUrl: string, bucket: string): string | null {
    try {
      // Try parsing as URL first
      const url = new URL(imageUrl);
      // Extract path and remove leading slash
      let key = url.pathname.slice(1);

      // Handle virtual-hosted-style URLs:
      // - https://bucket.s3.amazonaws.com/key
      // - https://bucket.s3.region.amazonaws.com/key
      if (url.hostname === `${bucket}.s3.amazonaws.com` || url.hostname.startsWith(`${bucket}.s3.`)) {
        return key;
      }

      // Handle path-style URLs: https://s3.region.amazonaws.com/bucket/key
      if (key.startsWith(`${bucket}/`)) {
        return key.slice(`${bucket}/`.length);
      }

      return null;
    } catch {
      // If it's not a valid URL, assume it's already a relative path like /uploads/hostels/...
      // and convert to S3 key format
      const path = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
      return path || null;
    }
  }
}
