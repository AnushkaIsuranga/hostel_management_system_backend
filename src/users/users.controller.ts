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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/interfaces/current-user.interface';
import { AdminOverviewDto, UserCreateDto, UserReadDto, UserUpdateDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAll(): Promise<UserReadDto[]> {
    return this.usersService.getAll();
  }

  @Get('stats')
  getStats(): Promise<AdminOverviewDto> {
    return this.usersService.getStats();
  }

  @Get('role/:role')
  getByRole(@Param('role') role: string): Promise<UserReadDto[]> {
    return this.usersService.getByRole(role);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<UserReadDto> {
    return this.usersService.getById(id);
  }

  @Post()
  create(@Body() dto: UserCreateDto): Promise<UserReadDto> {
    return this.usersService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserUpdateDto,
  ): Promise<UserReadDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    await this.usersService.delete(id, currentUser.userId, currentUser.role === UserRole.Admin);
  }
}
