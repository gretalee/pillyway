'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { AccommodationDetail } from '../accommodations/accommodation-types';
import type { CreateAccommodationPayload } from './waypoint-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useCreateAccommodation(slug: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<AccommodationDetail, Error, CreateAccommodationPayload>({
    mutationFn: async (payload) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/waypoints/${slug}/accommodations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create accommodation');
      return res.json() as Promise<AccommodationDetail>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['waypoint', slug] });
      queryClient.invalidateQueries({ queryKey: ['accommodations', data.caminoPointId] });
    },
  });
}
