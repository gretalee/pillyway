import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { EventType } from './event-type.enum';

@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  logEvent(eventType: EventType, userId: string | null, payload: Record<string, unknown>): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.prisma as any).userEvent
      .create({ data: { eventType, userId, payload } })
      .catch((err: unknown) => this.logger.warn(`EventLog write failed [${eventType}]: ${String(err)}`));
  }
}
