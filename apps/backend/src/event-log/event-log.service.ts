import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { EventType } from './event-type.enum';

@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  logEvent(
    eventType: EventType,
    userId: string | null,
    payload: Prisma.InputJsonObject,
  ): void {
    this.prisma.userEvent
      .create({ data: { eventType, userId, payload } })
      .catch((err: unknown) =>
        this.logger.warn(
          `EventLog write failed [${eventType}]: ${String(err)}`,
        ),
      );
  }
}
