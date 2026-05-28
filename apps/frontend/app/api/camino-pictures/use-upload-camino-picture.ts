'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { UploadCaminoPictureResult } from './camino-picture-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface UploadCaminoPictureVariables {
  file: File;
  isPrimary: boolean;
}

export function useUploadCaminoPicture(caminoId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<UploadCaminoPictureResult, Error & { status?: number }, UploadCaminoPictureVariables>({
    mutationFn: async ({ file, isPrimary }) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPrimary', isPrimary ? 'true' : 'false');

      const res = await fetch(`${API_URL}/caminos/${caminoId}/pictures`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw Object.assign(new Error('Upload failed'), { status: res.status });
      }

      return res.json() as Promise<UploadCaminoPictureResult>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['camino-pictures', caminoId] });
    },
  });
}
