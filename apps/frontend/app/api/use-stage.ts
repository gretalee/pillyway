'use client';

import { useQuery } from '@tanstack/react-query';
import type { StageDetail } from './stage-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchStage(caminoId: string, stageNumber: number): Promise<StageDetail> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/stages/${stageNumber}`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch stage'), { status: response.status });
  }
  return response.json() as Promise<StageDetail>;
}

export function useStage(caminoId: string, stageNumber: number) {
  return useQuery({
    queryKey: ['stage', caminoId, stageNumber],
    queryFn: () => fetchStage(caminoId, stageNumber),
    enabled: !!caminoId && stageNumber >= 1,
  });
}
