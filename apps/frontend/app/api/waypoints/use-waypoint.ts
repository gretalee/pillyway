'use client';
import { useQuery } from '@tanstack/react-query';
import type { WaypointDetail } from './waypoint-types';
import { fetchWaypoint } from './fetch-waypoint';

export function useWaypoint(slug: string) {
  return useQuery<WaypointDetail>({
    queryKey: ['waypoint', slug],
    queryFn: () => fetchWaypoint(slug),
    enabled: !!slug,
  });
}
