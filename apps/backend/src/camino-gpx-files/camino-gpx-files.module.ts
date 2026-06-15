import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { CaminoGpxFilesController } from './camino-gpx-files.controller';
import { CaminoGpxFilesService } from './camino-gpx-files.service';
import { GpxStorageService } from './gpx-storage.service';

// PrismaModule is @Global() — no need to import it here.
// EventLogModule is @Global() — no need to import it here.
@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [CaminoGpxFilesController],
  providers: [CaminoGpxFilesService, GpxStorageService],
})
export class CaminoGpxFilesModule {}
