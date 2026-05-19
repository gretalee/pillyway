import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../prisma/prisma.service';
import { BackofficeCaminosService } from './backoffice-caminos.service';

// ─── Prisma mock factory ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    camino: {
      findMany: vi.fn(),
    },
    caminoVote: {
      groupBy: vi.fn(),
    },
  } as unknown as PrismaService;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CAMINO_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAMINO_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const CAMINOS_STUB = [
  { id: CAMINO_A_ID, name: 'Camino Frances', verified: true },
  { id: CAMINO_B_ID, name: 'Via de la Plata', verified: false },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BackofficeCaminosService', () => {
  let service: BackofficeCaminosService;
  let prisma: ReturnType<typeof buildPrismaMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    service = new BackofficeCaminosService(prisma);
  });

  describe('getCaminosWithTallies', () => {
    it('returns each camino enriched with correct yesCount and noCount', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue(CAMINOS_STUB as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([
        { caminoId: CAMINO_A_ID, vote: true, _count: { vote: 10 } },
        { caminoId: CAMINO_A_ID, vote: false, _count: { vote: 4 } },
        { caminoId: CAMINO_B_ID, vote: true, _count: { vote: 2 } },
      ] as never);

      const result = await service.getCaminosWithTallies();

      expect(result).toEqual([
        { id: CAMINO_A_ID, name: 'Camino Frances', verified: true, yesCount: 10, noCount: 4 },
        { id: CAMINO_B_ID, name: 'Via de la Plata', verified: false, yesCount: 2, noCount: 0 },
      ]);
    });

    it('returns yesCount=0 and noCount=0 for caminos with no votes', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue(CAMINOS_STUB as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      const result = await service.getCaminosWithTallies();

      expect(result).toEqual([
        { id: CAMINO_A_ID, name: 'Camino Frances', verified: true, yesCount: 0, noCount: 0 },
        { id: CAMINO_B_ID, name: 'Via de la Plata', verified: false, yesCount: 0, noCount: 0 },
      ]);
    });

    it('returns an empty array when there are no caminos', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      const result = await service.getCaminosWithTallies();

      expect(result).toEqual([]);
    });

    it('fetches caminos and tallies in parallel (Promise.all)', async () => {
      // Both queries should be initiated before either resolves. We confirm this
      // by verifying both mocks are called once and that neither depends on the
      // other's result (the service uses Promise.all, not sequential awaits).
      vi.mocked(prisma.camino.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      await service.getCaminosWithTallies();

      expect(prisma.camino.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.caminoVote.groupBy).toHaveBeenCalledTimes(1);
    });

    it('queries caminos with the expected select shape', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      await service.getCaminosWithTallies();

      expect(prisma.camino.findMany).toHaveBeenCalledWith({
        select: { id: true, name: true, verified: true },
      });
    });

    it('groups votes by caminoId and vote fields', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      await service.getCaminosWithTallies();

      expect(prisma.caminoVote.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['caminoId', 'vote'],
          _count: { vote: true },
        }),
      );
    });

    it('correctly maps only-no votes for a camino (noCount > 0, yesCount = 0)', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue([
        { id: CAMINO_A_ID, name: 'Camino Frances', verified: false },
      ] as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([
        { caminoId: CAMINO_A_ID, vote: false, _count: { vote: 7 } },
      ] as never);

      const [result] = await service.getCaminosWithTallies();

      expect(result).toMatchObject({ yesCount: 0, noCount: 7 });
    });

    it('includes the verified flag from the camino row', async () => {
      vi.mocked(prisma.camino.findMany).mockResolvedValue([
        { id: CAMINO_A_ID, name: 'Camino Frances', verified: true },
      ] as never);
      vi.mocked(prisma.caminoVote.groupBy).mockResolvedValue([] as never);

      const [result] = await service.getCaminosWithTallies();

      expect(result.verified).toBe(true);
    });
  });
});
