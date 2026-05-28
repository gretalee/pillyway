'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { CaminoPicturesResponse } from './camino-picture-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

/**
 * Raw fetch for deleting a single camino picture — used in cancel-cleanup flows
 * where the hook cannot be used (outside component render).
 */
export async function deleteCaminoPicture(
  caminoId: string,
  pictureId: string,
  token: string,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/caminos/${caminoId}/pictures/${pictureId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    throw Object.assign(new Error('Delete failed'), { status: res.status });
  }
}

export function useDeleteCaminoPicture(caminoId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  type MutationContext = { previous: CaminoPicturesResponse | undefined };

  return useMutation<void, Error & { status?: number }, string, MutationContext>({
    mutationFn: async (pictureId: string) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');

      const res = await fetch(`${API_URL}/caminos/${caminoId}/pictures/${pictureId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
      });

      if (!res.ok) {
        throw Object.assign(new Error('Delete failed'), { status: res.status });
      }
    },
    onMutate: async (pictureId: string): Promise<MutationContext> => {
      await queryClient.cancelQueries({ queryKey: ['camino-pictures', caminoId] });

      const previous = queryClient.getQueryData<CaminoPicturesResponse>([
        'camino-pictures',
        caminoId,
      ]);

      if (previous) {
        const isPrimary = previous.primary?.id === pictureId;
        queryClient.setQueryData<CaminoPicturesResponse>(['camino-pictures', caminoId], {
          primary: isPrimary ? null : previous.primary,
          gallery: previous.gallery.filter((p) => p.id !== pictureId),
        });
      }

      return { previous };
    },
    onError: (_err, _pictureId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['camino-pictures', caminoId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['camino-pictures', caminoId] });
    },
  });
}
