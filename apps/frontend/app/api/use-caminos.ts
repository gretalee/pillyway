'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoSummary {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
}

export async function fetchCaminos(): Promise<CaminoSummary[]> {
  const response = await fetch(`${API_URL}/caminos`);
  if (!response.ok) throw new Error('Failed to fetch caminos');
  return response.json() as Promise<CaminoSummary[]>;
}

export function useCaminos() {
  return useQuery({
    queryKey: ['caminos'],
    queryFn: fetchCaminos,
  });
}
