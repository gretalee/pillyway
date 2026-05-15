'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchAccommodationsByWaypoint } from './fetch-accommodation';

export function useAccommodationsByWaypoint(caminoPointId: string) {
  return useQuery({
    queryKey: ['accommodations', caminoPointId],
    queryFn: () => fetchAccommodationsByWaypoint(caminoPointId),
    enabled: Boolean(caminoPointId),
  });
}
