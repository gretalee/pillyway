'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { UploadCaminoPictureResult } from './camino-picture-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Uploads multiple gallery pictures sequentially (one request per file,
 * isPrimary=false). Invalidates the camino-pictures query once all succeed.
 * Throws on the first failure — already-uploaded files stay in storage.
 */
export function useUploadCaminoPictures(caminoId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<UploadCaminoPictureResult[], Error & { status?: number }, File[]>({
    mutationFn: async (files) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');

      const results: UploadCaminoPictureResult[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('isPrimary', 'false');

        const res = await fetch(`${API_URL}/caminos/${caminoId}/pictures`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessTokenEncoded}` },
          body: formData,
        });

        if (!res.ok) {
          throw Object.assign(new Error('Upload failed'), { status: res.status });
        }

        results.push((await res.json()) as UploadCaminoPictureResult);
      }

      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['camino-pictures', caminoId] });
    },
  });
}
