import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { ImageProcessingService } from './image-processing.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [UploadsController],
  providers: [UploadsService, ImageProcessingService],
  exports: [UploadsService, ImageProcessingService],
})
export class UploadsModule {}
