'use client';

import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import { useMutation } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function deleteCamino(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_URL}/caminos/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error('Delete failed'), { status: response.status });
  }
}

export function useDeleteCamino() {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation({
    mutationFn: (id: string) => deleteCamino(id, accessTokenEncoded ?? ''),
  });
}
