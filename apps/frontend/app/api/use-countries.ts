'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchCountries(): Promise<string[]> {
  const response = await fetch(`${API_URL}/countries`);
  if (!response.ok) throw new Error('Failed to fetch countries');
  return response.json() as Promise<string[]>;
}
export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
    staleTime: Infinity,
  });
}
