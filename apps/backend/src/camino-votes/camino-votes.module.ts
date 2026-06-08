import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserEventsModule } from '../user-events/user-events.module';
import { CaminoVotesController } from './camino-votes.controller';
import { CaminoVotesService } from './camino-votes.service';

@Module({
  imports: [PrismaModule, AuthModule, UserEventsModule],
  controllers: [CaminoVotesController],
  providers: [CaminoVotesService],
  exports: [CaminoVotesService],
})
export class CaminoVotesModule {}
