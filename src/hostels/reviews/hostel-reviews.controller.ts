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

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import {
  HostelRatingSummaryDto,
  HostelReviewCreateDto,
  HostelReviewReadDto,
  HostelReviewUpdateDto,
} from './dto/hostel-reviews.dto';
import { HostelReviewsService } from './hostel-reviews.service';

@Controller('hostels/:hostelId/reviews')
export class HostelReviewsController {
  constructor(private readonly hostelReviewsService: HostelReviewsService) {}

  @Get()
  getForHostel(@Param('hostelId', ParseUUIDPipe) hostelId: string): Promise<HostelReviewReadDto[]> {
    return this.hostelReviewsService.getForHostel(hostelId);
  }

  @Get('summary')
  getSummary(@Param('hostelId', ParseUUIDPipe) hostelId: string): Promise<HostelRatingSummaryDto> {
    return this.hostelReviewsService.getSummary(hostelId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: HostelReviewCreateDto,
  ): Promise<HostelReviewReadDto> {
    return this.hostelReviewsService.create(hostelId, currentUser.userId, dto);
  }

  @Put(':reviewId')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: HostelReviewUpdateDto,
  ): Promise<HostelReviewReadDto> {
    return this.hostelReviewsService.update(
      hostelId,
      reviewId,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
      dto,
    );
  }

  @Delete(':reviewId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    await this.hostelReviewsService.delete(
      hostelId,
      reviewId,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
    );
  }
}
