import { Injectable, Inject } from '@nestjs/common';

import {
  AppBadRequestException,
  AppForbiddenException,
  AppNotFoundException,
} from '../../common/exceptions/app-exception';
import { DatabaseService } from '../../database/database.service';
import { HostelImageReadDto } from './dto/hostel-images.dto';
import { StorageService } from './storage.interface';
import { STORAGE_SERVICE_TOKEN } from './storage.provider';

@Injectable()
export class HostelImagesService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(STORAGE_SERVICE_TOKEN) private readonly storageService: StorageService,
  ) {}

  async getImagesByHostelId(hostelId: string): Promise<HostelImageReadDto[]> {
    const images = await this.db.hostelImage.findMany({
      where: {
        hostelId,
        isDeleted: false,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return images.map((image) => this.toReadDto(image));
  }

  async addImage(
    hostelId: string,
    file: Express.Multer.File,
    displayOrder: number | undefined,
    userId: string,
    isAdmin: boolean,
  ): Promise<HostelImageReadDto> {
    const hostel = await this.db.hostel.findFirst({
      where: {
        id: hostelId,
        isDeleted: false,
      },
    });

    if (!hostel) {
      throw new AppNotFoundException('Hostel not found.');
    }

    if (!isAdmin && hostel.ownerId !== userId) {
      throw new AppForbiddenException('You are not allowed to upload images for this hostel.');
    }

    const count = await this.db.hostelImage.count({
      where: {
        hostelId,
        isDeleted: false,
      },
    });

    if (count >= 8) {
      throw new AppBadRequestException('Maximum 8 images allowed per hostel');
    }

    const stored = await this.storageService.uploadImage(file, hostelId);

    try {
      const image = await this.db.hostelImage.create({
        data: {
          hostelId,
          fileName: stored.storedFileName,
          contentType: stored.contentType,
          fileSize: BigInt(stored.fileSize),
          imageUrl: stored.imageUrl,
          displayOrder: displayOrder ?? 0,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      return this.toReadDto(image);
    } catch (error) {
      await this.storageService.deleteImage(stored.imageUrl);
      throw error;
    }
  }

  async deleteImage(imageId: string, userId: string, isAdmin: boolean) {
    const image = await this.db.hostelImage.findFirst({
      where: {
        id: imageId,
        isDeleted: false,
      },
      include: {
        hostel: true,
      },
    });

    if (!image) {
      throw new AppNotFoundException('Image not found.');
    }

    if (!isAdmin && image.hostel.ownerId !== userId) {
      throw new AppForbiddenException('You are not allowed to delete this image.');
    }

    await this.storageService.deleteImage(image.imageUrl);
    await this.db.hostelImage.update({
      where: { id: imageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateImageOrder(imageId: string, order: number, userId: string, isAdmin: boolean) {
    if (order < 0) {
      throw new AppBadRequestException('Display order must be greater than or equal to 0.');
    }

    const image = await this.db.hostelImage.findFirst({
      where: {
        id: imageId,
        isDeleted: false,
      },
      include: {
        hostel: true,
      },
    });

    if (!image) {
      throw new AppNotFoundException('Image not found.');
    }

    if (!isAdmin && image.hostel.ownerId !== userId) {
      throw new AppForbiddenException('You are not allowed to reorder this image.');
    }

    await this.db.hostelImage.update({
      where: { id: imageId },
      data: {
        displayOrder: order,
        updatedAt: new Date(),
      },
    });
  }

  async deleteImageByUrl(imageUrl: string) {
    await this.storageService.deleteImage(imageUrl);
  }

  private toReadDto(image: any): HostelImageReadDto {
    return {
      id: image.id,
      hostelId: image.hostelId,
      fileName: image.fileName,
      contentType: image.contentType,
      fileSize: Number(image.fileSize),
      imageUrl: image.imageUrl,
      displayOrder: image.displayOrder,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }
}
