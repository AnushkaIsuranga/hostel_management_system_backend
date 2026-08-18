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
} from '@nestjs/common';

import {
  HostelAmenityBulkCreateDto,
  HostelAmenityCreateDto,
  HostelAmenityReadDto,
} from './dto/hostel-amenities.dto';
import { HostelAmenitiesService } from './hostel-amenities.service';

@Controller('hostel-amenities')
export class HostelAmenitiesController {
  constructor(private readonly hostelAmenitiesService: HostelAmenitiesService) {}

  @Get()
  getAll(): Promise<HostelAmenityReadDto[]> {
    return this.hostelAmenitiesService.getAll();
  }

  @Get(':hostelId/:amenityId')
  getByKey(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @Param('amenityId', ParseUUIDPipe) amenityId: string,
  ): Promise<HostelAmenityReadDto | null> {
    return this.hostelAmenitiesService.getByKey(hostelId, amenityId);
  }

  @Post()
  create(@Body() dto: HostelAmenityCreateDto): Promise<HostelAmenityReadDto> {
    return this.hostelAmenitiesService.create(dto);
  }

  @Post('by-names')
  @HttpCode(HttpStatus.OK)
  createByNames(@Body() dto: HostelAmenityBulkCreateDto): Promise<HostelAmenityReadDto[]> {
    return this.hostelAmenitiesService.createByNames(dto);
  }

  @Delete(':hostelId/:amenityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @Param('amenityId', ParseUUIDPipe) amenityId: string,
  ) {
    await this.hostelAmenitiesService.delete(hostelId, amenityId);
  }
}
