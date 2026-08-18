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
  UseGuards,
} from '@nestjs/common';

import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/app.enums';
import { AppForbiddenException } from '../common/exceptions/app-exception';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: HostelCreateDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<HostelReadDto> {
    if (currentUser.role !== UserRole.Owner && currentUser.role !== UserRole.Admin) {
      throw new AppForbiddenException('Only owners and admins can create hostels.');
    }

    return this.hostelsService.create(currentUser.userId, dto);
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
