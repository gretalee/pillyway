'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { CaminoGpxFile } from './camino-gpx-file-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface UploadCaminoGpxFileVariables {
  file: File;
  fileName: string;
  uploaderName: string;
}

export function useUploadCaminoGpxFile(caminoId: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<CaminoGpxFile, Error & { status?: number }, UploadCaminoGpxFileVariables>({
    mutationFn: async ({ file, fileName, uploaderName }) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('uploaderName', uploaderName);

      const res = await fetch(`${API_URL}/caminos/${caminoId}/gpx-files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw Object.assign(new Error('Upload failed'), { status: res.status });
      }

      return res.json() as Promise<CaminoGpxFile>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['camino-gpx-files', caminoId] });
    },
  });
}
