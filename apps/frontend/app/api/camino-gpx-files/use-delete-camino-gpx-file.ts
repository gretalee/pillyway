'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { CaminoGpxFile } from './camino-gpx-file-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useDeleteCaminoGpxFile(caminoId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  type MutationContext = { previous: CaminoGpxFile[] | undefined };

  return useMutation<void, Error & { status?: number }, string, MutationContext>({
    mutationFn: async (gpxFileId: string) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');

      const res = await fetch(`${API_URL}/caminos/${caminoId}/gpx-files/${gpxFileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
      });

      if (!res.ok) {
        throw Object.assign(new Error('Delete failed'), { status: res.status });
      }
    },
    onMutate: async (gpxFileId: string): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['camino-gpx-files', caminoId] });

      const previous = queryClient.getQueryData<CaminoGpxFile[]>(['camino-gpx-files', caminoId]);

      if (previous) {
        queryClient.setQueryData<CaminoGpxFile[]>(
          ['camino-gpx-files', caminoId],
          previous.filter((f) => f.id !== gpxFileId),
        );
      }

      return { previous };
    },
    onError: (_err, _gpxFileId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['camino-gpx-files', caminoId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['camino-gpx-files', caminoId] });
    },
  });
}
