import { Module } from '@nestjs/common';

import { InteractionEventsController } from './interaction-events.controller';
import { InteractionEventsService } from './interaction-events.service';

@Module({
  controllers: [InteractionEventsController],
  providers: [InteractionEventsService],
  exports: [InteractionEventsService],
})
export class InteractionEventsModule {}
