'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { SightDetail, UpdateSightPayload } from './sight-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

export function useUpdateSight(id: string, caminoPointId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<SightDetail, Error, UpdateSightPayload>({
    mutationFn: async (payload) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/sights/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const status = res.status;
        throw Object.assign(new Error('Failed to update sight'), { status });
      }
      return res.json() as Promise<SightDetail>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sights', caminoPointId] });
      queryClient.invalidateQueries({ queryKey: ['sight', id] });
    },
  });
}
