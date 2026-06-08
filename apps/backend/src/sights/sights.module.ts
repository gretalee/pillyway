import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UserEventsModule } from '../user-events/user-events.module';
import { SightsController } from './sights.controller';
import { SightsService } from './sights.service';

@Module({
  imports: [PrismaModule, AuthModule, CommonModule, UploadsModule, UserEventsModule],
  controllers: [SightsController],
  providers: [SightsService],
  exports: [SightsService],
})
export class SightsModule {}
