import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WaypointsController } from './waypoints.controller';
import { WaypointsService } from './waypoints.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WaypointsController],
  providers: [WaypointsService],
})
export class WaypointsModule {}
