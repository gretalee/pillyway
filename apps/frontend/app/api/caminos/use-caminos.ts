'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCaminos, type FetchCaminosParams } from './caminos';

export function useCaminos(params?: FetchCaminosParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['caminos', params],
    queryFn: () => fetchCaminos(params),
    enabled: options?.enabled,
  });
}
