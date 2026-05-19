import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CaminoVotesModule } from '../camino-votes/camino-votes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BackofficeController } from './backoffice.controller';
import { BackofficeCaminosService } from './backoffice-caminos.service';

@Module({
  imports: [PrismaModule, AuthModule, CaminoVotesModule],
  controllers: [BackofficeController],
  providers: [BackofficeCaminosService],
})
export class BackofficeModule {}
