'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoPointDetail {
  id: string;
  name: string;
  country: string;
  description: string | null;
  position: number;
}

export interface CaminoDetailFull {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  caminoPoints: CaminoPointDetail[];
}

export async function fetchCamino(id: string): Promise<CaminoDetailFull> {
  const response = await fetch(`${API_URL}/caminos/${id}`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch camino'), { status: response.status });
  }
  return response.json() as Promise<CaminoDetailFull>;
}

export function useCamino(id: string) {
  return useQuery({
    queryKey: ['camino', id],
    queryFn: () => fetchCamino(id),
    enabled: !!id,
  });
}
