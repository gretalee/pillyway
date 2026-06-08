import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

export const USER_EVENT_NAMES = [
  'user_registered',
  'user_logged_in',
  'camino_created',
  'camino_updated',
  'camino_voted',
  'camino_image_uploaded',
  'accommodation_created',
  'accommodation_updated',
  'sight_created',
  'sight_updated',
] as const;

export type UserEventName = (typeof USER_EVENT_NAMES)[number];

interface TrackEventInput {
  name: UserEventName;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonObject;
  idempotencyKey?: string | null;
}

@Injectable()
export class UserEventsService {
  private readonly logger = new Logger(UserEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(input: TrackEventInput): Promise<void> {
    const data = {
      eventName: input.name,
      userId: input.userId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      eventIdempotencyKey: input.idempotencyKey ?? null,
    };

    try {
      if (input.idempotencyKey) {
        await this.prisma.userEvent.createMany({
          data: [data],
          skipDuplicates: true,
        });
        return;
      }

      await this.prisma.userEvent.create({ data });
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        return;
      }
      this.logger.error(`Failed to track user event "${input.name}"`, err);
    }
  }

  async trackAuthenticatedUser(payload: KindeJwtPayload): Promise<void> {
    const userId = payload.sub;
    if (!userId) {
      return;
    }

    const metadata = this.authMetadata(payload);

    try {
      await this.prisma.userEvent.createMany({
        data: [
          {
            eventName: 'user_registered',
            userId,
            metadata,
            eventIdempotencyKey: userId,
          },
          {
            eventName: 'user_logged_in',
            userId,
            metadata,
            eventIdempotencyKey: `${userId}:${String(payload.iat ?? 'unknown')}`,
          },
        ],
        skipDuplicates: true,
      });
    } catch (err) {
      this.logger.error('Failed to track authenticated user events', err);
    }
  }

  private authMetadata(payload: KindeJwtPayload): Prisma.InputJsonObject {
    return {
      issuer: payload.iss,
      audience: Array.isArray(payload.aud) ? payload.aud : [payload.aud],
      token_iat: payload.iat,
      token_exp: payload.exp,
      roles: (payload.roles ?? []).map((role) => role.key),
    };
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    );
  }
}
