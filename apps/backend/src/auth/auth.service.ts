import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { KindeJwtPayload } from './kinde-jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLog: EventLogService,
  ) {}

  async sessionInit(payload: KindeJwtPayload): Promise<{ kindeUserId: string; isNewUser: boolean }> {
    const existing = await this.prisma.user.findUnique({
      where: { kindeUserId: payload.sub },
    });

    if (!existing) {
      try {
        await this.prisma.user.create({ data: { kindeUserId: payload.sub } });
        this.eventLog.logEvent(EventType.USER_REGISTERED, payload.sub, {
          kinde_user_id: payload.sub,
          ...(payload.email ? { email: payload.email } : {}),
        });
        return { kindeUserId: payload.sub, isNewUser: true };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          this.eventLog.logEvent(EventType.USER_LOGGED_IN, payload.sub, { kinde_user_id: payload.sub });
          return { kindeUserId: payload.sub, isNewUser: false };
        }
        throw err;
      }
    }

    this.eventLog.logEvent(EventType.USER_LOGGED_IN, payload.sub, { kinde_user_id: payload.sub });
    return { kindeUserId: payload.sub, isNewUser: false };
  }
}
