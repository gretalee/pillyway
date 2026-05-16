import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccommodationsModule } from './accommodations/accommodations.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CaminoPointsModule } from './camino-points/camino-points.module';
import { CaminosModule } from './caminos/caminos.module';
import { CountriesModule } from './countries/countries.module';
import { PrismaModule } from './prisma/prisma.module';
import { SightsModule } from './sights/sights.module';
import { StagesModule } from './stages/stages.module';
import { UploadsModule } from './uploads/uploads.module';
import { WaypointsModule } from './waypoints/waypoints.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CaminosModule,
    CaminoPointsModule,
    CountriesModule,
    StagesModule,
    WaypointsModule,
    AccommodationsModule,
    SightsModule,
    UploadsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
