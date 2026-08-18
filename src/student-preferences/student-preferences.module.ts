import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StudentPreferencesController } from './student-preferences.controller';
import { StudentPreferencesService } from './student-preferences.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentPreferencesController],
  providers: [StudentPreferencesService],
  exports: [StudentPreferencesService],
})
export class StudentPreferencesModule {}
