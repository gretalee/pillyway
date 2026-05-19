import { describe, it, expect, vi, afterEach } from 'vitest';

import { fetchMyVote } from './fetch-camino-vote-me';

afterEach(() => {
  vi.restoreAllMocks();
});

const TOKEN = 'bearer-token-123';

describe('fetchMyVote', () => {
  it('returns the vote object on a successful 200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ vote: true }), { status: 200 }),
    );

    const result = await fetchMyVote('camino-abc', TOKEN);

    expect(result, 'must return the vote object on success').toEqual({ vote: true });
  });

  it('returns null on a 404 response (user has not voted)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 404 }));

    const result = await fetchMyVote('camino-abc', TOKEN);

    expect(result, '404 must resolve to null, not throw').toBeNull();
  });

  it('sends the Authorization header with the token', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ vote: false }), { status: 200 }));

    await fetchMyVote('camino-abc', TOKEN);

    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Authorization'], 'Authorization header must be sent').toBe(
      `Bearer ${TOKEN}`,
    );
  });

  it('calls the correct endpoint URL', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ vote: false }), { status: 200 }));

    await fetchMyVote('camino-xyz', TOKEN);

    const [calledUrl] = fetchSpy.mock.calls[0]!;
    expect(String(calledUrl), 'must call the votes/me endpoint for the given camino').toContain(
      '/caminos/camino-xyz/votes/me',
    );
  });

  it('throws with a status property on a non-ok, non-404 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(fetchMyVote('camino-abc', TOKEN)).rejects.toMatchObject({
      message: 'Failed to fetch my vote',
      status: 500,
    });
  });

  it('throws on 401 Unauthorized', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(fetchMyVote('camino-abc', TOKEN)).rejects.toMatchObject({ status: 401 });
  });
});
