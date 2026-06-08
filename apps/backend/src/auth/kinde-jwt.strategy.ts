import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserEventsService } from '../user-events/user-events.service';

export interface KindeRole {
  id: string;
  key: string;
  name: string;
}

export interface KindeJwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  email?: string;
  given_name?: string;
  family_name?: string;
  roles?: KindeRole[];
  [key: string]: unknown;
}

@Injectable()
export class KindeJwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly userEventsService?: UserEventsService,
  ) {
    const issuerUrl = config.getOrThrow<string>('KINDE_ISSUER_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${issuerUrl}/.well-known/jwks`,
      }),
      issuer: issuerUrl,
    });
  }

  async validate(payload: KindeJwtPayload): Promise<KindeJwtPayload> {
    await this.userEventsService?.trackAuthenticatedUser(payload);
    return payload;
  }
}
