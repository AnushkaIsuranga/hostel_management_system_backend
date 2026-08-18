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
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: UserCreateDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<UserReadDto> {
    this.ensureAdminAccess(currentUser);
    return this.usersService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserUpdateDto,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<UserReadDto> {
    if (currentUser.role === UserRole.Admin) {
      return this.usersService.update(id, dto);
    }

    if (currentUser.userId !== id) {
      throw new AppForbiddenException('You can only update your own profile.', 'profile_owner_only');
    }

    return this.usersService.update(id, {
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      role: currentUser.role,
    });
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

  private ensureAdminAccess(currentUser?: CurrentUser) {
    if (!currentUser || currentUser.role !== UserRole.Admin) {
      throw new AppForbiddenException('Only admins can manage users.', 'admin_only');
    }
  }
}
