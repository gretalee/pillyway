'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { AccommodationDetail, UpdateAccommodationPayload } from './accommodation-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useUpdateAccommodation(id: string, caminoPointId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<AccommodationDetail, Error, UpdateAccommodationPayload>({
    mutationFn: async (payload) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/accommodations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const status = res.status;
        throw Object.assign(new Error('Failed to update accommodation'), { status });
      }
      return res.json() as Promise<AccommodationDetail>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations', caminoPointId] });
      queryClient.invalidateQueries({ queryKey: ['accommodation', id] });
    },
  });
}
