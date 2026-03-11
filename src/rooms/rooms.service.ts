import { Injectable } from '@nestjs/common';

import {
  AppConflictException,
  AppNotFoundException,
} from '../common/exceptions/app-exception';
import { decimalToNumber } from '../common/utils/prisma.util';
import { PrismaService } from '../prisma/prisma.service';
import { RoomCreateDto, RoomReadDto, RoomUpdateDto } from './dto/rooms.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(): Promise<RoomReadDto[]> {
    const rooms = await this.prisma.room.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return rooms.map((room) => this.toReadDto(room));
  }

  async getById(id: string): Promise<RoomReadDto> {
    const room = await this.prisma.room.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!room) {
      throw new AppNotFoundException('Room not found.');
    }

    return this.toReadDto(room);
  }

  async create(dto: RoomCreateDto): Promise<RoomReadDto> {
    try {
      const room = await this.prisma.room.create({
        data: {
          hostelId: dto.hostelId,
          roomType: dto.roomType,
          price: dto.price,
          capacity: dto.capacity,
          isAvailable: dto.isAvailable,
          createdAt: new Date(),
          isDeleted: false,
        },
      });

      return this.toReadDto(room);
    } catch {
      throw new AppConflictException('A room with the same unique fields already exists.', 'room_conflict');
    }
  }

  async update(id: string, dto: RoomUpdateDto): Promise<RoomReadDto> {
    const room = await this.prisma.room.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!room) {
      throw new AppNotFoundException('Room not found.');
    }

    const updated = await this.prisma.room.update({
      where: { id },
      data: {
        roomType: dto.roomType,
        price: dto.price,
        capacity: dto.capacity,
        isAvailable: dto.isAvailable,
        updatedAt: new Date(),
      },
    });

    return this.toReadDto(updated);
  }

  async delete(id: string) {
    const room = await this.prisma.room.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!room) {
      throw new AppNotFoundException('Room not found.');
    }

    await this.prisma.room.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private toReadDto(room: {
    id: string;
    hostelId: string;
    roomType: string;
    price: unknown;
    capacity: number;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date | null;
  }): RoomReadDto {
    return {
      id: room.id,
      hostelId: room.hostelId,
      roomType: room.roomType,
      price: decimalToNumber(room.price as never) ?? 0,
      capacity: room.capacity,
      isAvailable: room.isAvailable,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }
}
