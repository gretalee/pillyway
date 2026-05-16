'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { SightDetail } from '../sights/sight-types';
import type { CreateSightPayload } from './waypoint-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useCreateSight(slug: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<SightDetail, Error, CreateSightPayload>({
    mutationFn: async (payload) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/waypoints/${slug}/sights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create sight');
      return res.json() as Promise<SightDetail>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waypoint', slug] });
      queryClient.invalidateQueries({ queryKey: ['sights', data.caminoPointId] });
    },
  });
}
