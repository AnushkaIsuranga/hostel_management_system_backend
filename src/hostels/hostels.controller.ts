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

import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/interfaces/current-user.interface';
import {
  HostelCreateDto,
  HostelReadDto,
  HostelSearchRequestDto,
  HostelSearchResultDto,
  HostelUpdateDto,
} from './dto/hostels.dto';
import { HostelsService } from './hostels.service';

@Controller('hostels')
export class HostelsController {
  constructor(private readonly hostelsService: HostelsService) {}

  @Get()
  getAll(): Promise<HostelReadDto[]> {
    return this.hostelsService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<HostelReadDto> {
    return this.hostelsService.getById(id);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(
    @Body() dto: HostelSearchRequestDto,
    @CurrentUserDecorator() currentUser?: CurrentUser,
  ): Promise<HostelSearchResultDto[]> {
    return this.hostelsService.search(dto, currentUser?.userId);
  }

  @Post()
  create(@Body() dto: HostelCreateDto): Promise<HostelReadDto> {
    return this.hostelsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HostelUpdateDto,
  ): Promise<HostelReadDto> {
    return this.hostelsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.hostelsService.delete(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<HostelReadDto> {
    return this.hostelsService.restore(id);
  }
}
