import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { ActivityTrackingMiddleware } from './auth/middleware/activity-tracking.middleware';
import { AmenitiesModule } from './amenities/amenities.module';
import { ProblemDetailsFilter } from './common/exceptions/problem-details.filter';
import { AppConfigModule } from './config/app-config.module';
import { HealthController } from './health.controller';
import { HostelsModule } from './hostels/hostels.module';
import { InteractionEventsModule } from './interaction-events/interaction-events.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { StudentPreferencesModule } from './student-preferences/student-preferences.module';
import { UniversitiesModule } from './universities/universities.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AppConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    UniversitiesModule,
    AmenitiesModule,
    RoomsModule,
    HostelsModule,
    InteractionEventsModule,
    StudentPreferencesModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ProblemDetailsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ActivityTrackingMiddleware).forRoutes('*');
  }
}
