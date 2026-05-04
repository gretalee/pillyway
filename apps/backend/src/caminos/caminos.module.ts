import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CaminosController } from './caminos.controller';
import { CaminosService } from './caminos.service';

@Module({
  imports: [AuthModule],
  controllers: [CaminosController],
  providers: [CaminosService],
})
export class CaminosModule {}
