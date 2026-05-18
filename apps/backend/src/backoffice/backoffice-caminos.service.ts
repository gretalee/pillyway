import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface CaminoWithTally {
  id: string;
  name: string;
  verified: boolean;
  yesCount: number;
  noCount: number;
}

@Injectable()
export class BackofficeCaminosService {
  private readonly logger = new Logger(BackofficeCaminosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCaminosWithTallies(): Promise<CaminoWithTally[]> {
    this.logger.debug('getCaminosWithTallies');

    const [caminos, tallies] = await Promise.all([
      this.prisma.camino.findMany({
        select: { id: true, name: true, verified: true },
      }),
      this.prisma.caminoVote.groupBy({
        by: ['caminoId', 'vote'],
        _count: { vote: true },
      }),
    ]);

    const map = new Map<string, { yes: number; no: number }>();
    for (const t of tallies) {
      const entry = map.get(t.caminoId) ?? { yes: 0, no: 0 };
      if (t.vote) entry.yes = t._count.vote;
      else entry.no = t._count.vote;
      map.set(t.caminoId, entry);
    }

    return caminos.map((c) => ({
      ...c,
      yesCount: map.get(c.id)?.yes ?? 0,
      noCount: map.get(c.id)?.no ?? 0,
    }));
  }
}
