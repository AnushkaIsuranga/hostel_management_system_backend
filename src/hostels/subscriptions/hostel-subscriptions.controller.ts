import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { AppNotFoundException } from '../../common/exceptions/app-exception';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import { HostelSubscriptionReadDto, UpsertHostelSubscriptionDto } from './dto/hostel-subscriptions.dto';
import { HostelSubscriptionsService } from './hostel-subscriptions.service';

@Controller('hostels/:hostelId/subscription')
@UseGuards(JwtAuthGuard)
export class HostelSubscriptionsController {
  constructor(private readonly hostelSubscriptionsService: HostelSubscriptionsService) {}

  @Get()
  async get(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<HostelSubscriptionReadDto> {
    const subscription = await this.hostelSubscriptionsService.get(
      hostelId,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
    );

    if (!subscription) {
      throw new AppNotFoundException('Subscription not found.');
    }

    return subscription;
  }

  @Put()
  upsert(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: UpsertHostelSubscriptionDto,
  ): Promise<HostelSubscriptionReadDto> {
    return this.hostelSubscriptionsService.upsert(
      hostelId,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
      dto,
    );
  }
}
