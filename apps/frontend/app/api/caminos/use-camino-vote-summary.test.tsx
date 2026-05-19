import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';

import { useCaminoVoteSummary } from './use-camino-vote-summary';
import * as fetchModule from './fetch-camino-vote-summary';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries so tests fail fast on error paths.
        retry: false,
        // Remove staleTime overrides so tests always refetch.
        staleTime: 0,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

vi.mock('./fetch-camino-vote-summary', async (importOriginal) => {
  const original = await importOriginal<typeof import('./fetch-camino-vote-summary')>();
  return { ...original, fetchCaminoVoteSummary: vi.fn() };
});

describe('useCaminoVoteSummary', () => {
  it('fetches and returns vote summary data for a given caminoId', async () => {
    vi.mocked(fetchModule.fetchCaminoVoteSummary).mockResolvedValueOnce({
      yesCount: 7,
      noCount: 2,
    });

    const { result } = renderHook(() => useCaminoVoteSummary('camino-1'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.yesCount, 'yesCount must be returned from the hook').toBe(7);
    expect(result.current.data?.noCount, 'noCount must be returned from the hook').toBe(2);
  });

  it('calls fetchCaminoVoteSummary with the correct caminoId', async () => {
    vi.mocked(fetchModule.fetchCaminoVoteSummary).mockResolvedValueOnce({
      yesCount: 0,
      noCount: 0,
    });

    const { result } = renderHook(() => useCaminoVoteSummary('camino-xyz'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchModule.fetchCaminoVoteSummary).toHaveBeenCalledWith('camino-xyz');
  });

  it('is disabled when caminoId is an empty string', () => {
    const { result } = renderHook(() => useCaminoVoteSummary(''), {
      wrapper: makeWrapper(),
    });

    // When disabled, the query stays in "pending" without fetching.
    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchModule.fetchCaminoVoteSummary).not.toHaveBeenCalled();
  });

  it('surfaces an error when the fetch function rejects', async () => {
    vi.mocked(fetchModule.fetchCaminoVoteSummary).mockRejectedValueOnce(
      Object.assign(new Error('Failed to fetch vote summary'), { status: 500 }),
    );

    const { result } = renderHook(() => useCaminoVoteSummary('camino-err'), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(
      (result.current.error as Error).message,
      'error message must be surfaced',
    ).toBe('Failed to fetch vote summary');
  });
});
