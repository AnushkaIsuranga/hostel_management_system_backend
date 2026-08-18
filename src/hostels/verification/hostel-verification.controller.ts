import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { AppForbiddenException } from '../../common/exceptions/app-exception';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import { HostelVerificationService } from './hostel-verification.service';
import { HostelVerificationRequestReadDto, ReviewVerificationRequestDto } from './dto/hostel-verification.dto';

@Controller()
export class HostelVerificationController {
  constructor(private readonly hostelVerificationService: HostelVerificationService) {}

  @Post('hostels/:hostelId/verification/request')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  requestVerification(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<HostelVerificationRequestReadDto> {
    return this.hostelVerificationService.requestVerification(hostelId, currentUser.userId);
  }

  @Post('verification-requests/:requestId/approve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: ReviewVerificationRequestDto,
  ): Promise<HostelVerificationRequestReadDto> {
    if (currentUser.role !== UserRole.Admin) {
      throw new AppForbiddenException('Only admins can review verification requests.', 'admin_only');
    }

    return this.hostelVerificationService.approveVerification(requestId, currentUser.userId, dto.adminNotes);
  }

  @Post('verification-requests/:requestId/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: ReviewVerificationRequestDto,
  ): Promise<HostelVerificationRequestReadDto> {
    if (currentUser.role !== UserRole.Admin) {
      throw new AppForbiddenException('Only admins can review verification requests.', 'admin_only');
    }

    return this.hostelVerificationService.rejectVerification(requestId, currentUser.userId, dto.adminNotes);
  }

  @Get('hostels/:hostelId/verification/requests')
  @UseGuards(JwtAuthGuard)
  getForHostel(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ): Promise<HostelVerificationRequestReadDto[]> {
    return this.hostelVerificationService.getForHostel(
      hostelId,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
    );
  }
}
