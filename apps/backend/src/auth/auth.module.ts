import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { UserEventsModule } from '../user-events/user-events.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { KindeJwtStrategy } from './kinde-jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), UserEventsModule],
  providers: [KindeJwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
