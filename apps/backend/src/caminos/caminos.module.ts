import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { StagesModule } from '../stages/stages.module';
import { CaminosController } from './caminos.controller';
import { CaminosService } from './caminos.service';

@Module({
  imports: [AuthModule, CommonModule, StagesModule],
  controllers: [CaminosController],
  providers: [CaminosService],
})
export class CaminosModule {}
