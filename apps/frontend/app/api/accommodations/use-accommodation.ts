'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchAccommodation } from './fetch-accommodation';

export function useAccommodation(id: string) {
  return useQuery({
    queryKey: ['accommodation', id],
    queryFn: () => fetchAccommodation(id),
    enabled: Boolean(id),
  });
}
