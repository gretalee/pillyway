import { describe, it, expect, vi, afterEach } from 'vitest';

import { fetchCaminoVoteSummary } from './fetch-camino-vote-summary';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchCaminoVoteSummary', () => {
  it('returns yesCount and noCount on a successful response', async () => {
    const mockPayload = { yesCount: 12, noCount: 3 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockPayload), { status: 200 }),
    );

    const result = await fetchCaminoVoteSummary('camino-abc');

    expect(result.yesCount, 'yesCount must match the API response').toBe(12);
    expect(result.noCount, 'noCount must match the API response').toBe(3);
  });

  it('calls the correct endpoint URL', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ yesCount: 0, noCount: 0 }), { status: 200 }));

    await fetchCaminoVoteSummary('camino-xyz');

    const [calledUrl] = fetchSpy.mock.calls[0]!;
    expect(String(calledUrl), 'must call the votes/summary endpoint for the given camino').toContain(
      '/caminos/camino-xyz/votes/summary',
    );
  });

  it('throws with a status property on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );

    await expect(fetchCaminoVoteSummary('camino-abc')).rejects.toMatchObject({
      message: 'Failed to fetch vote summary',
      status: 500,
    });
  });

  it('throws on a 403 Forbidden response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 403 }),
    );

    await expect(fetchCaminoVoteSummary('camino-abc')).rejects.toMatchObject({ status: 403 });
  });
});
