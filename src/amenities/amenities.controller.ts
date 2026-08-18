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

import { AmenityCreateDto, AmenityReadDto, AmenityUpdateDto } from './dto/amenities.dto';
import { AmenitiesService } from './amenities.service';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Get()
  getAll(): Promise<AmenityReadDto[]> {
    return this.amenitiesService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<AmenityReadDto> {
    return this.amenitiesService.getById(id);
  }

  @Post()
  create(@Body() dto: AmenityCreateDto): Promise<AmenityReadDto> {
    return this.amenitiesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AmenityUpdateDto,
  ): Promise<AmenityReadDto> {
    return this.amenitiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.amenitiesService.delete(id);
  }
}
