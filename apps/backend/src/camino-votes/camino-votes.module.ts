import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CaminoVotesController } from './camino-votes.controller';
import { CaminoVotesService } from './camino-votes.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CaminoVotesController],
  providers: [CaminoVotesService],
  exports: [CaminoVotesService],
})
export class CaminoVotesModule {}
