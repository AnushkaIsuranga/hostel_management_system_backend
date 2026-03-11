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
} from '@nestjs/common';

import {
  InteractionEventCreateDto,
  InteractionEventReadDto,
  InteractionEventUpdateDto,
} from './dto/interaction-events.dto';
import { InteractionEventsService } from './interaction-events.service';

@Controller('interactionevents')
export class InteractionEventsController {
  constructor(private readonly interactionEventsService: InteractionEventsService) {}

  @Get()
  getAll(): Promise<InteractionEventReadDto[]> {
    return this.interactionEventsService.getAll();
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string): Promise<InteractionEventReadDto> {
    return this.interactionEventsService.getById(id);
  }

  @Post()
  create(@Body() dto: InteractionEventCreateDto): Promise<InteractionEventReadDto> {
    return this.interactionEventsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InteractionEventUpdateDto,
  ): Promise<InteractionEventReadDto> {
    return this.interactionEventsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.interactionEventsService.delete(id);
  }
}
