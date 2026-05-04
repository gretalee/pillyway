'use client';

import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoPointSearchResult {
  id: string;
  name: string;
  country: string;
  description: string | null;
}

export async function searchCaminoPoints(
  name: string,
  country: string,
): Promise<CaminoPointSearchResult[]> {
  const params = new URLSearchParams({ name, country });
  const response = await fetch(`${API_URL}/camino-points/search?${params.toString()}`);
  if (!response.ok) throw new Error('Search failed');
  return response.json() as Promise<CaminoPointSearchResult[]>;
}

export function useCaminoPointsSearch(searchKey: string) {
  return useQuery({
    queryKey: ['camino-points-search', searchKey],
    queryFn: () => {
      const [name, country] = searchKey.split('::');
      return searchCaminoPoints(name ?? '', country ?? '');
    },
    enabled: searchKey !== '',
    retry: false,
  });
}
