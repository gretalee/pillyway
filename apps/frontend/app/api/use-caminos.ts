'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCaminos } from './caminos';

export type { CaminoSummary } from './caminos';

export function useCaminos() {
  return useQuery({
    queryKey: ['caminos'],
    queryFn: fetchCaminos,
  });
}
