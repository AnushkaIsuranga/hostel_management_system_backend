import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';

import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/interfaces/current-user.interface';
import { StudentPreferenceReadDto, StudentPreferenceUpsertDto } from './dto/student-preferences.dto';
import { StudentPreferencesService } from './student-preferences.service';

@Controller('student-preferences')
@UseGuards(JwtAuthGuard)
export class StudentPreferencesController {
  constructor(private readonly studentPreferencesService: StudentPreferencesService) {}

  @Get('me')
  getMine(@CurrentUserDecorator() currentUser: CurrentUser): Promise<StudentPreferenceReadDto> {
    return this.studentPreferencesService.getMine(currentUser.userId);
  }

  @Put('me')
  upsertMine(
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: StudentPreferenceUpsertDto,
  ): Promise<StudentPreferenceReadDto> {
    return this.studentPreferencesService.upsertMine(currentUser.userId, dto);
  }
}
