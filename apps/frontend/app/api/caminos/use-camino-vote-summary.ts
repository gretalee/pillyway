'use client';

import { useQuery } from '@tanstack/react-query';

export { fetchCaminoVoteSummary, type CaminoVoteSummary } from './fetch-camino-vote-summary';
import { fetchCaminoVoteSummary } from './fetch-camino-vote-summary';

export function useCaminoVoteSummary(caminoId: string) {
  return useQuery({
    queryKey: ['votes', 'summary', caminoId],
    queryFn: () => fetchCaminoVoteSummary(caminoId),
    staleTime: 60_000,
    enabled: !!caminoId,
  });
}
