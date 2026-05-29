import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccommodationsModule } from './accommodations/accommodations.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { CaminoPicturesModule } from './camino-pictures/camino-pictures.module';
import { CaminoPointsModule } from './camino-points/camino-points.module';
import { CaminoVotesModule } from './camino-votes/camino-votes.module';
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
    CaminoPicturesModule,
    CaminoPointsModule,
    CaminoVotesModule,
    CountriesModule,
    StagesModule,
    WaypointsModule,
    AccommodationsModule,
    SightsModule,
    UploadsModule,
    BackofficeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
