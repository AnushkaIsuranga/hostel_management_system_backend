import { Injectable } from '@nestjs/common';

import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
} from '../common/exceptions/app-exception';
import { PrismaService } from '../prisma/prisma.service';
import { UniversityCreateDto, UniversityReadDto, UniversityUpdateDto } from './dto/universities.dto';

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<UniversityReadDto[]> {
    const universities = await this.prisma.university.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });

    return universities.map((university) => ({
      id: university.id,
      name: university.name,
      latitude: university.latitude,
      longitude: university.longitude,
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    }));
  }

  async getById(id: string): Promise<UniversityReadDto> {
    const university = await this.prisma.university.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!university) {
      throw new AppNotFoundException('University not found.');
    }

    return {
      id: university.id,
      name: university.name,
      latitude: university.latitude,
      longitude: university.longitude,
      createdAt: university.createdAt,
      updatedAt: university.updatedAt,
    };
  }

  async create(dto: UniversityCreateDto): Promise<UniversityReadDto> {
    this.validateCoordinates(dto.latitude, dto.longitude);

    try {
      const university = await this.prisma.university.create({
        data: {
          name: dto.name,
          latitude: dto.latitude,
          longitude: dto.longitude,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      return {
        id: university.id,
        name: university.name,
        latitude: university.latitude,
        longitude: university.longitude,
        createdAt: university.createdAt,
        updatedAt: university.updatedAt,
      };
    } catch {
      throw new AppConflictException('A university with the same name already exists.', 'university_name_conflict');
    }
  }

  async update(id: string, dto: UniversityUpdateDto): Promise<UniversityReadDto> {
    this.validateCoordinates(dto.latitude, dto.longitude);

    const existing = await this.prisma.university.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new AppNotFoundException('University not found.');
    }

    try {
      const university = await this.prisma.university.update({
        where: { id },
        data: {
          name: dto.name,
          latitude: dto.latitude,
          longitude: dto.longitude,
          updatedAt: new Date(),
        },
      });

      return {
        id: university.id,
        name: university.name,
        latitude: university.latitude,
        longitude: university.longitude,
        createdAt: university.createdAt,
        updatedAt: university.updatedAt,
      };
    } catch {
      throw new AppConflictException('A university with the same name already exists.', 'university_name_conflict');
    }
  }

  async delete(id: string) {
    const existing = await this.prisma.university.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existing) {
      throw new AppNotFoundException('University not found.');
    }

    await this.prisma.university.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private validateCoordinates(latitude: number, longitude: number) {
    if (latitude < -90 || latitude > 90) {
      throw new AppBadRequestException('Latitude must be between -90 and 90.');
    }

    if (longitude < -180 || longitude > 180) {
      throw new AppBadRequestException('Longitude must be between -180 and 180.');
    }
  }
}
