'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCamino } from './caminos';

export type { CaminoDetailFull, CaminoPointDetail } from './caminos';

export function useCamino(id: string) {
  return useQuery({
    queryKey: ['camino', id],
    queryFn: () => fetchCamino(id),
    enabled: !!id,
  });
}
