'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CaminoDetailFull } from './caminos';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface SetCaminoVerifiedPayload {
  verified: boolean;
}

export async function setCaminoVerified(
  id: string,
  payload: SetCaminoVerifiedPayload,
  token: string,
): Promise<CaminoDetailFull> {
  const response = await fetch(`${API_URL}/caminos/${id}/verified`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw Object.assign(new Error('Failed to set verified status'), { status: response.status });
  }

  return response.json() as Promise<CaminoDetailFull>;
}

export function useSetCaminoVerified() {
  const { accessTokenEncoded } = useKindeBrowserClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SetCaminoVerifiedPayload }) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      return setCaminoVerified(id, payload, accessTokenEncoded);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['backoffice', 'caminos'] });
    },
  });
}
