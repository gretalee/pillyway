import type { StageDetail } from './stage-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchStage(
  caminoId: string,
  stageNumber: number,
): Promise<StageDetail> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/stages/${stageNumber}`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch stage'), { status: response.status });
  }
  return response.json() as Promise<StageDetail>;
}
