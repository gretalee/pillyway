import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export const USER_EVENT_NAMES = [
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
}

@Injectable()
export class UserEventsService {
  private readonly logger = new Logger(UserEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async track(input: TrackEventInput): Promise<void> {
    try {
      await this.prisma.userEvent.create({
        data: {
          eventName: input.name,
          userId: input.userId ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          metadata: input.metadata ?? {},
        },
      });
    } catch (err) {
      this.logger.error(`Failed to track user event "${input.name}"`, err);
    }
  }
}
