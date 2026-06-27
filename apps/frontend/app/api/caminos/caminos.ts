const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  verified: boolean;
  countries: string[];
  createdBy: string;
  createdAt: string;
}

export interface CaminoPointDetail {
  id: string;
  slug: string;
  name: string;
  country: string;
  description: string | null;
  position: number;
  lat: number | null;
  lng: number | null;
}

export interface CaminoDetailFull {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  verified: boolean;
  countries: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  caminoPoints: CaminoPointDetail[];
}

export interface PaginatedCaminosResponse {
  data: CaminoSummary[];
  total: number;
  page: number;
  totalPages: number;
  availableCountries: string[];
}

export const CAMINOS_PER_PAGE = 6;

export interface FetchCaminosParams {
  verified?: boolean;
  countries?: string[];
  page?: number;
  limit?: number;
}

export async function fetchCaminos(
  params?: FetchCaminosParams,
): Promise<PaginatedCaminosResponse> {
  const qs = new URLSearchParams();
  if (params?.verified !== undefined) qs.set('verified', String(params.verified));
  if (params?.countries?.length) qs.set('countries', params.countries.join(','));
  if (params?.page && params.page > 1) qs.set('page', String(params.page));
  qs.set('limit', String(params?.limit ?? CAMINOS_PER_PAGE));
  const query = qs.toString();
  const response = await fetch(`${API_URL}/caminos${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch caminos');
  return response.json() as Promise<PaginatedCaminosResponse>;
}

export async function fetchCamino(id: string): Promise<CaminoDetailFull> {
  const response = await fetch(`${API_URL}/caminos/${id}`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch camino'), { status: response.status });
  }
  return response.json() as Promise<CaminoDetailFull>;
}
