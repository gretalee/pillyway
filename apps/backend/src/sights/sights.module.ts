import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SightsController } from './sights.controller';
import { SightsService } from './sights.service';

@Module({
  imports: [PrismaModule, AuthModule, UploadsModule],
  controllers: [SightsController],
  providers: [SightsService],
  exports: [SightsService],
})
export class SightsModule {}
