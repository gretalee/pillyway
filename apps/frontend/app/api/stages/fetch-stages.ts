import type { StageListItem } from './stage-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchStages(caminoId: string): Promise<StageListItem[]> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/stages`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch stages'), { status: response.status });
  }
  return response.json() as Promise<StageListItem[]>;
}
