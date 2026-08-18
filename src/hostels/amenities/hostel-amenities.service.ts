import { Injectable } from '@nestjs/common';

import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
} from '../../common/exceptions/app-exception';
import { DatabaseService } from '../../database/database.service';
import {
  HostelAmenityBulkCreateDto,
  HostelAmenityCreateDto,
  HostelAmenityReadDto,
} from './dto/hostel-amenities.dto';

@Injectable()
export class HostelAmenitiesService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(): Promise<HostelAmenityReadDto[]> {
    return this.db.hostelAmenity.findMany();
  }

  async getByKey(hostelId: string, amenityId: string): Promise<HostelAmenityReadDto | null> {
    return this.db.hostelAmenity.findUnique({
      where: {
        hostelId_amenityId: {
          hostelId,
          amenityId,
        },
      },
    });
  }

  async create(dto: HostelAmenityCreateDto): Promise<HostelAmenityReadDto> {
    const existing = await this.db.hostelAmenity.findUnique({
      where: {
        hostelId_amenityId: {
          hostelId: dto.hostelId,
          amenityId: dto.amenityId,
        },
      },
    });

    if (existing) {
      throw new AppConflictException('Hostel amenity already exists.', 'hostel_amenity_conflict');
    }

    return this.db.hostelAmenity.create({
      data: {
        hostelId: dto.hostelId,
        amenityId: dto.amenityId,
      },
    });
  }

  async createByNames(dto: HostelAmenityBulkCreateDto): Promise<HostelAmenityReadDto[]> {
    if (!dto.hostelId) {
      throw new AppBadRequestException('HostelId is required.');
    }

    const names = [...new Set((dto.amenityNames ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => Boolean(value)))];

    if (!names.length) {
      throw new AppBadRequestException('At least one amenity name is required.');
    }

    const hostel = await this.db.hostel.findFirst({
      where: {
        id: dto.hostelId,
        isDeleted: false,
      },
    });

    if (!hostel) {
      throw new AppNotFoundException('Hostel not found.');
    }

    const existingAmenities = await this.db.amenity.findMany({
      where: { isDeleted: false },
    });
    const amenityMap = new Map(existingAmenities.map((amenity) => [amenity.name.trim().toLowerCase(), amenity]));

    for (const name of names) {
      const normalized = name.trim().toLowerCase();
      if (amenityMap.has(normalized)) {
        continue;
      }

      const created = await this.db.amenity.create({
        data: {
          name,
          createdAt: new Date(),
          isDeleted: false,
        },
      });
      amenityMap.set(normalized, created);
    }

    const links: HostelAmenityReadDto[] = [];
    for (const name of names) {
      const amenity = amenityMap.get(name.trim().toLowerCase());
      if (!amenity) {
        continue;
      }

      const existingLink = await this.db.hostelAmenity.findUnique({
        where: {
          hostelId_amenityId: {
            hostelId: dto.hostelId,
            amenityId: amenity.id,
          },
        },
      });

      if (existingLink) {
        links.push(existingLink);
        continue;
      }

      const createdLink = await this.db.hostelAmenity.create({
        data: {
          hostelId: dto.hostelId,
          amenityId: amenity.id,
        },
      });
      links.push(createdLink);
    }

    return links;
  }

  async delete(hostelId: string, amenityId: string) {
    const existing = await this.db.hostelAmenity.findUnique({
      where: {
        hostelId_amenityId: {
          hostelId,
          amenityId,
        },
      },
    });

    if (!existing) {
      throw new AppNotFoundException('Hostel amenity link not found.');
    }

    await this.db.hostelAmenity.delete({
      where: {
        hostelId_amenityId: {
          hostelId,
          amenityId,
        },
      },
    });
  }
}
