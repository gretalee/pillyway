import { Module } from '@nestjs/common';

import { CaminoPointsController } from './camino-points.controller';
import { CaminoPointsService } from './camino-points.service';

@Module({
  controllers: [CaminoPointsController],
  providers: [CaminoPointsService],
})
export class CaminoPointsModule {}
