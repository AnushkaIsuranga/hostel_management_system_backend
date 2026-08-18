import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';

import { RoomCreateDto, RoomReadDto, RoomUpdateDto } from './dto/rooms.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  getAll(): Promise<RoomReadDto[]> {
    return this.roomsService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<RoomReadDto> {
    return this.roomsService.getById(id);
  }

  @Post()
  create(@Body() dto: RoomCreateDto): Promise<RoomReadDto> {
    return this.roomsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoomUpdateDto,
  ): Promise<RoomReadDto> {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.roomsService.delete(id);
  }
}
