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

import { UniversityCreateDto, UniversityReadDto, UniversityUpdateDto } from './dto/universities.dto';
import { UniversitiesService } from './universities.service';

@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  getAll(): Promise<UniversityReadDto[]> {
    return this.universitiesService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<UniversityReadDto> {
    return this.universitiesService.getById(id);
  }

  @Post()
  create(@Body() dto: UniversityCreateDto): Promise<UniversityReadDto> {
    return this.universitiesService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UniversityUpdateDto,
  ): Promise<UniversityReadDto> {
    return this.universitiesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.universitiesService.delete(id);
  }
}
