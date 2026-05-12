'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchStage } from './fetch-stage';

export function useStage(caminoId: string, stageNumber: number) {
  return useQuery({
    queryKey: ['stage', caminoId, stageNumber],
    queryFn: () => fetchStage(caminoId, stageNumber),
    enabled: !!caminoId && stageNumber >= 1,
  });
}
