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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { CurrentUserDecorator } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/app.enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/interfaces/current-user.interface';
import { HostelImageReadDto, UpdateHostelImageOrderDto } from './dto/hostel-images.dto';
import { HostelImagesService } from './hostel-images.service';

@Controller('hostelimages')
export class HostelImagesController {
  constructor(private readonly hostelImagesService: HostelImagesService) {}

  @Get(':hostelId')
  getImages(@Param('hostelId', ParseUUIDPipe) hostelId: string): Promise<HostelImageReadDto[]> {
    return this.hostelImagesService.getImagesByHostelId(hostelId);
  }

  @Post(':hostelId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @Param('hostelId', ParseUUIDPipe) hostelId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body('displayOrder') displayOrder?: number,
  ): Promise<HostelImageReadDto> {
    return this.hostelImagesService.addImage(
      hostelId,
      file,
      displayOrder === undefined ? undefined : Number(displayOrder),
      currentUser.userId,
      currentUser.role === UserRole.Admin,
    );
  }

  @Delete(':imageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
  ) {
    await this.hostelImagesService.deleteImage(
      imageId,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
    );
  }

  @Put(':imageId/order')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderImage(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUserDecorator() currentUser: CurrentUser,
    @Body() dto: UpdateHostelImageOrderDto,
  ) {
    await this.hostelImagesService.updateImageOrder(
      imageId,
      dto.displayOrder,
      currentUser.userId,
      currentUser.role === UserRole.Admin,
    );
  }
}
