'use client';
import { useMutation } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { UploadImagesResponse } from './waypoint-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useUploadImages() {
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<UploadImagesResponse, Error, File[]>({
    mutationFn: async (files) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const res = await fetch(`${API_URL}/uploads/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessTokenEncoded}` },
        body: formData,
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        const isTooBig = res.status === 413 || errorText.includes('limit');
        throw Object.assign(new Error('Upload failed'), { isTooBig });
      }
      return res.json() as Promise<UploadImagesResponse>;
    },
  });
}
