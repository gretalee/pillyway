'use client';

import { useQuery } from '@tanstack/react-query';
import type { CaminoGpxFile } from './camino-gpx-file-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchCaminoGpxFiles(caminoId: string): Promise<CaminoGpxFile[]> {
  const res = await fetch(`${API_URL}/caminos/${caminoId}/gpx-files`);
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch GPX files'), { status: res.status });
  }
  return res.json() as Promise<CaminoGpxFile[]>;
}

export function useCaminoGpxFiles(caminoId: string) {
  return useQuery({
    queryKey: ['camino-gpx-files', caminoId],
    queryFn: () => fetchCaminoGpxFiles(caminoId),
    enabled: !!caminoId,
  });
}
