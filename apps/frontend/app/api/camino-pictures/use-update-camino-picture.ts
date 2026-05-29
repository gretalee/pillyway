'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';

import type { UploadCaminoPictureResult } from './camino-picture-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface UpdateCaminoPictureVars {
  pictureId: string;
  label: string | null;
}

export function useUpdateCaminoPicture(caminoId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<UploadCaminoPictureResult, Error & { status?: number }, UpdateCaminoPictureVars>({
    mutationFn: async ({ pictureId, label }) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/caminos/${caminoId}/pictures/${pictureId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessTokenEncoded}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        throw Object.assign(new Error('Update failed'), { status: res.status });
      }
      return res.json() as Promise<UploadCaminoPictureResult>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['camino-pictures', caminoId] });
    },
  });
}
