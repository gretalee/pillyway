'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useKindeBrowserClient } from '@kinde-oss/kinde-auth-nextjs';
import type { UpdateWaypointPayload, WaypointDetail } from './waypoint-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export function useUpdateWaypoint(slug: string) {
  const queryClient = useQueryClient();
  const { accessTokenEncoded } = useKindeBrowserClient();

  return useMutation<WaypointDetail, Error, UpdateWaypointPayload>({
    mutationFn: async (payload) => {
      if (!accessTokenEncoded) throw new Error('Not authenticated');
      const res = await fetch(`${API_URL}/waypoints/${slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessTokenEncoded}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw Object.assign(new Error('Failed to update waypoint'), {
          status: res.status,
        });
      }
      return res.json() as Promise<WaypointDetail>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waypoint', slug] });
    },
  });
}
