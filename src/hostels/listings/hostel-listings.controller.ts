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

import {
  HostelListingCreateDto,
  HostelListingReadDto,
  HostelListingUpdateDto,
} from './dto/hostel-listings.dto';
import { HostelListingsService } from './hostel-listings.service';

@Controller('hostellistings')
export class HostelListingsController {
  constructor(private readonly hostelListingsService: HostelListingsService) {}

  @Get()
  getAll(): Promise<HostelListingReadDto[]> {
    return this.hostelListingsService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<HostelListingReadDto> {
    return this.hostelListingsService.getById(id);
  }

  @Post()
  create(@Body() dto: HostelListingCreateDto): Promise<HostelListingReadDto> {
    return this.hostelListingsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HostelListingUpdateDto,
  ): Promise<HostelListingReadDto> {
    return this.hostelListingsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.hostelListingsService.delete(id);
  }
}
