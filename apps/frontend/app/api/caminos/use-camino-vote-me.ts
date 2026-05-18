'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface MyVote {
  vote: boolean;
}

export async function fetchMyVote(caminoId: string, token: string): Promise<MyVote | null> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/votes/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch my vote'), { status: response.status });
  }

  return response.json() as Promise<MyVote>;
}

export function useCaminoVoteMe(caminoId: string) {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useQuery({
    queryKey: ['votes', 'me', caminoId],
    queryFn: () => fetchMyVote(caminoId, accessTokenEncoded ?? ''),
    enabled: !!caminoId && !!accessTokenEncoded,
    retry: (failureCount, error) =>
      (error as { status?: number })?.status === 404 ? false : failureCount < 3,
  });
}
