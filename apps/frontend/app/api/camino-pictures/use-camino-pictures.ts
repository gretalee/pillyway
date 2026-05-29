'use client';

import { useQuery } from '@tanstack/react-query';
import type { CaminoPicturesResponse } from './camino-picture-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchCaminoPictures(caminoId: string): Promise<CaminoPicturesResponse> {
  const res = await fetch(`${API_URL}/caminos/${caminoId}/pictures`);
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch camino pictures'), { status: res.status });
  }
  return res.json() as Promise<CaminoPicturesResponse>;
}

export function useCaminoPictures(caminoId: string) {
  return useQuery({
    queryKey: ['camino-pictures', caminoId],
    queryFn: () => fetchCaminoPictures(caminoId),
    enabled: !!caminoId,
  });
}
