'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchSight } from './fetch-sight';

export function useSight(id: string) {
  return useQuery({
    queryKey: ['sight', id],
    queryFn: () => fetchSight(id),
    enabled: Boolean(id),
  });
}
