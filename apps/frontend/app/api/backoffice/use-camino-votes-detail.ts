'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoVoteDetail {
  vote: boolean;
  updatedAt: string;
}

export async function fetchCaminoVotesDetail(
  caminoId: string,
  token: string,
): Promise<CaminoVoteDetail[]> {
  const response = await fetch(`${API_URL}/backoffice/caminos/${caminoId}/votes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch camino vote details'), {
      status: response.status,
    });
  }

  return response.json() as Promise<CaminoVoteDetail[]>;
}

export function useCaminoVotesDetail(caminoId: string | null) {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useQuery({
    queryKey: ['backoffice', 'camino-votes', caminoId],
    queryFn: () => fetchCaminoVotesDetail(caminoId!, accessTokenEncoded ?? ''),
    enabled: !!caminoId && !!accessTokenEncoded,
  });
}
