import type { WaypointDetail } from './waypoint-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function fetchWaypoint(slug: string): Promise<WaypointDetail> {
  const res = await fetch(`${API_URL}/waypoints/${slug}`);
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch waypoint'), { status: res.status });
  }
  return res.json() as Promise<WaypointDetail>;
}
