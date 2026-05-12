'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchStages } from './fetch-stages';

export function useStages(caminoId: string) {
  return useQuery({
    queryKey: ['stages', caminoId],
    queryFn: () => fetchStages(caminoId),
    enabled: !!caminoId,
  });
}
