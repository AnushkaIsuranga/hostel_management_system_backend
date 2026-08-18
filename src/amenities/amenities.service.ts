import { Injectable } from '@nestjs/common';

import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
} from '../common/exceptions/app-exception';
import { DatabaseService } from '../database/database.service';
import { AmenityCreateDto, AmenityReadDto, AmenityUpdateDto } from './dto/amenities.dto';

@Injectable()
export class AmenitiesService {
  constructor(private readonly db: DatabaseService) {}

  async getAll(): Promise<AmenityReadDto[]> {
    const amenities = await this.db.amenity.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });

    return amenities.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      createdAt: amenity.createdAt,
      updatedAt: amenity.updatedAt,
    }));
  }

  async getById(id: string): Promise<AmenityReadDto> {
    const amenity = await this.db.amenity.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!amenity) {
      throw new AppNotFoundException('Amenity not found.');
    }

    return {
      id: amenity.id,
      name: amenity.name,
      createdAt: amenity.createdAt,
      updatedAt: amenity.updatedAt,
    };
  }

  async create(dto: AmenityCreateDto): Promise<AmenityReadDto> {
    const names = this.splitAmenityNames(dto.name);
    if (!names.length) {
      throw new AppBadRequestException('Amenity name is required.');
    }

    const existingAmenities = await this.db.amenity.findMany({
      where: { isDeleted: false },
      select: { name: true },
    });
    const existingNames = new Set(existingAmenities.map((amenity) => this.normalizeName(amenity.name)));

    let firstCreated: AmenityReadDto | null = null;

    for (const name of names) {
      const normalized = this.normalizeName(name);
      if (existingNames.has(normalized)) {
        continue;
      }

      const amenity = await this.db.amenity.create({
        data: {
          name,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      existingNames.add(normalized);

      if (!firstCreated) {
        firstCreated = {
          id: amenity.id,
          name: amenity.name,
          createdAt: amenity.createdAt,
          updatedAt: amenity.updatedAt,
        };
      }
    }

    if (!firstCreated) {
      throw new AppConflictException('An amenity with the same name already exists.', 'amenity_name_conflict');
    }

    return firstCreated;
  }

  async update(id: string, dto: AmenityUpdateDto): Promise<AmenityReadDto> {
    const amenity = await this.db.amenity.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!amenity) {
      throw new AppNotFoundException('Amenity not found.');
    }

    const names = this.splitAmenityNames(dto.name);
    if (!names.length) {
      throw new AppBadRequestException('Amenity name is required.');
    }

    const primaryName = names[0];
    const duplicate = await this.db.amenity.findFirst({
      where: {
        id: { not: id },
        isDeleted: false,
        name: {
          equals: primaryName,
          mode: 'insensitive',
        },
      },
    });

    if (duplicate) {
      throw new AppConflictException('An amenity with the same name already exists.', 'amenity_name_conflict');
    }

    const updated = await this.db.amenity.update({
      where: { id },
      data: {
        name: primaryName,
        updatedAt: new Date(),
      },
    });

    const existingAmenities = await this.db.amenity.findMany({
      where: {
        id: { not: id },
        isDeleted: false,
      },
      select: { name: true },
    });
    const existingNames = new Set(existingAmenities.map((item) => this.normalizeName(item.name)));
    existingNames.add(this.normalizeName(primaryName));
    existingNames.add(this.normalizeName(amenity.name));

    for (const extraName of names.slice(1)) {
      const normalized = this.normalizeName(extraName);
      if (existingNames.has(normalized)) {
        continue;
      }

      await this.db.amenity.create({
        data: {
          name: extraName,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      existingNames.add(normalized);
    }

    return {
      id: updated.id,
      name: updated.name,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: string) {
    const amenity = await this.db.amenity.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!amenity) {
      throw new AppNotFoundException('Amenity not found.');
    }

    await this.db.amenity.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private splitAmenityNames(raw: string): string[] {
    return [...new Set((raw ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => Boolean(value)))];
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase();
  }
}
