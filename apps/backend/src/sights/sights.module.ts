import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SightsController } from './sights.controller';
import { SightsService } from './sights.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SightsController],
  providers: [SightsService],
  exports: [SightsService],
})
export class SightsModule {}
