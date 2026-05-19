import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';

import { useCaminoVoteMe } from './use-camino-vote-me';
import * as fetchModule from './fetch-camino-vote-me';

beforeEach(() => {
  vi.clearAllMocks();
});

// Mock Kinde so the hook can be rendered without a real Kinde context.
vi.mock('@kinde-oss/kinde-auth-nextjs', () => ({
  useKindeBrowserClient: vi.fn(),
}));

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

vi.mock('./fetch-camino-vote-me', async (importOriginal) => {
  const original = await importOriginal<typeof import('./fetch-camino-vote-me')>();
  return { ...original, fetchMyVote: vi.fn() };
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useCaminoVoteMe', () => {
  it('fetches the vote when caminoId and accessToken are both present', async () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      accessTokenEncoded: 'my-token',
    } as ReturnType<typeof useKindeBrowserClient>);

    vi.mocked(fetchModule.fetchMyVote).mockResolvedValueOnce({ vote: true });

    const { result } = renderHook(() => useCaminoVoteMe('camino-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data, 'data must reflect the API response').toEqual({ vote: true });
  });

  it('passes the access token to fetchMyVote', async () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      accessTokenEncoded: 'secret-token',
    } as ReturnType<typeof useKindeBrowserClient>);

    vi.mocked(fetchModule.fetchMyVote).mockResolvedValueOnce({ vote: false });

    const { result } = renderHook(() => useCaminoVoteMe('camino-abc'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchModule.fetchMyVote).toHaveBeenCalledWith('camino-abc', 'secret-token');
  });

  it('is disabled when accessTokenEncoded is null', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      accessTokenEncoded: null,
    } as ReturnType<typeof useKindeBrowserClient>);

    const { result } = renderHook(() => useCaminoVoteMe('camino-1'), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchModule.fetchMyVote, 'fetch must not be called without a token').not.toHaveBeenCalled();
  });

  it('is disabled when caminoId is an empty string', () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      accessTokenEncoded: 'my-token',
    } as ReturnType<typeof useKindeBrowserClient>);

    const { result } = renderHook(() => useCaminoVoteMe(''), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchModule.fetchMyVote, 'fetch must not be called without a caminoId').not.toHaveBeenCalled();
  });

  it('returns null data when the API returns null (user has not voted)', async () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      accessTokenEncoded: 'my-token',
    } as ReturnType<typeof useKindeBrowserClient>);

    vi.mocked(fetchModule.fetchMyVote).mockResolvedValueOnce(null);

    const { result } = renderHook(() => useCaminoVoteMe('camino-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data, 'null (no vote yet) must pass through cleanly').toBeNull();
  });

  it('surfaces errors from fetchMyVote', async () => {
    vi.mocked(useKindeBrowserClient).mockReturnValue({
      accessTokenEncoded: 'my-token',
    } as ReturnType<typeof useKindeBrowserClient>);

    // Use status 404 so the hook's custom retry function skips retries
    // (the hook only retries non-404 errors). This makes the error state
    // settle immediately without exhausting the retry budget.
    vi.mocked(fetchModule.fetchMyVote).mockRejectedValueOnce(
      Object.assign(new Error('Failed to fetch my vote'), { status: 404 }),
    );

    const { result } = renderHook(() => useCaminoVoteMe('camino-err'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect((result.current.error as Error).message).toBe('Failed to fetch my vote');
  });
});
