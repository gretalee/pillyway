import { Module } from '@nestjs/common';

import { UserEventsService } from './user-events.service';

@Module({
  providers: [UserEventsService],
  exports: [UserEventsService],
})
export class UserEventsModule {}
