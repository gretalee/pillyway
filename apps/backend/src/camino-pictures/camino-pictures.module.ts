import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UserEventsModule } from '../user-events/user-events.module';
import { CaminoPicturesController } from './camino-pictures.controller';
import { CaminoPicturesService } from './camino-pictures.service';

// PrismaModule is @Global() — no need to import it here.
@Module({
  imports: [UploadsModule, AuthModule, UserEventsModule],
  controllers: [CaminoPicturesController],
  providers: [CaminoPicturesService],
})
export class CaminoPicturesModule {}
