'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useMutation } from '@tanstack/react-query';

import { CaminoPointPayload } from './use-create-camino';
import { CaminoDetailFull } from './use-camino';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface UpdateCaminoPayload {
  name?: string;
  description?: string | null;
  caminoPoints?: CaminoPointPayload[];
}

export async function updateCamino(
  id: string,
  payload: UpdateCaminoPayload,
  token: string,
): Promise<CaminoDetailFull> {
  const response = await fetch(`${API_URL}/caminos/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw Object.assign(new Error('Update failed'), { status: response.status });
  }
  return response.json() as Promise<CaminoDetailFull>;
}

export function useUpdateCamino() {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCaminoPayload }) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      return updateCamino(id, payload, accessTokenEncoded);
    },
  });
}
