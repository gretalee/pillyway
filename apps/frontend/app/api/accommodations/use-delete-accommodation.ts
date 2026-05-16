'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useDeleteAccommodation(id: string, caminoPointId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/accommodations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
      });
      if (!res.ok) {
        const status = res.status;
        throw Object.assign(new Error('Failed to delete accommodation'), { status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accommodations', caminoPointId] });
    },
  });
}
