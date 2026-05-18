'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CastVotePayload {
  vote: boolean;
}

export async function castVote(
  caminoId: string,
  payload: CastVotePayload,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/votes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw Object.assign(new Error('Failed to cast vote'), { status: response.status });
  }
}

export function useCastVote(caminoId: string) {
  const { accessTokenEncoded } = useKindeBrowserClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CastVotePayload) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      return castVote(caminoId, payload, accessTokenEncoded);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['votes', 'summary', caminoId] });
      void queryClient.invalidateQueries({ queryKey: ['votes', 'me', caminoId] });
    },
  });
}
