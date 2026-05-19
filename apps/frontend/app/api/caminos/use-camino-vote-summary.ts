'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoVoteSummary {
  yesCount: number;
  noCount: number;
}

export async function fetchCaminoVoteSummary(caminoId: string): Promise<CaminoVoteSummary> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/votes/summary`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch vote summary'), { status: response.status });
  }
  return response.json() as Promise<CaminoVoteSummary>;
}

export function useCaminoVoteSummary(caminoId: string) {
  return useQuery({
    queryKey: ['votes', 'summary', caminoId],
    queryFn: () => fetchCaminoVoteSummary(caminoId),
    staleTime: 60_000,
    enabled: !!caminoId,
  });
}
