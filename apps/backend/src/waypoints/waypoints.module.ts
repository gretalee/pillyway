import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserEventsModule } from '../user-events/user-events.module';
import { WaypointsController } from './waypoints.controller';
import { WaypointsService } from './waypoints.service';

@Module({
  imports: [PrismaModule, AuthModule, UserEventsModule],
  controllers: [WaypointsController],
  providers: [WaypointsService],
})
export class WaypointsModule {}
