import type { AccommodationDetail } from './accommodation-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3033/api';

export async function fetchAccommodation(id: string): Promise<AccommodationDetail> {
  const res = await fetch(`${API_URL}/accommodations/${id}`);
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch accommodation'), { status: res.status });
  }
  return res.json() as Promise<AccommodationDetail>;
}

export async function fetchAccommodationsByWaypoint(
  caminoPointId: string,
): Promise<AccommodationDetail[]> {
  const res = await fetch(
    `${API_URL}/accommodations?caminoPointId=${encodeURIComponent(caminoPointId)}`,
  );
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch accommodations'), { status: res.status });
  }
  return res.json() as Promise<AccommodationDetail[]>;
}
