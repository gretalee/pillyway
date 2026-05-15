import type { SightDetail } from './sight-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

export async function fetchSight(id: string): Promise<SightDetail> {
  const res = await fetch(`${API_URL}/sights/${id}`);
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch sight'), { status: res.status });
  }
  return res.json() as Promise<SightDetail>;
}

export async function fetchSightsByWaypoint(caminoPointId: string): Promise<SightDetail[]> {
  const res = await fetch(
    `${API_URL}/sights?caminoPointId=${encodeURIComponent(caminoPointId)}`,
  );
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch sights'), { status: res.status });
  }
  return res.json() as Promise<SightDetail[]>;
}
