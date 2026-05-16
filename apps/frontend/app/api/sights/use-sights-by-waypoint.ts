'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchSightsByWaypoint } from './fetch-sight';

export function useSightsByWaypoint(caminoPointId: string) {
  return useQuery({
    queryKey: ['sights', caminoPointId],
    queryFn: () => fetchSightsByWaypoint(caminoPointId),
    enabled: Boolean(caminoPointId),
  });
}
