const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface CaminoSummary {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  createdBy: string;
}

export interface CaminoPointDetail {
  id: string;
  name: string;
  country: string;
  description: string | null;
  position: number;
}

export interface CaminoDetailFull {
  id: string;
  name: string;
  description: string | null;
  verified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  caminoPoints: CaminoPointDetail[];
}

export async function fetchCaminos(): Promise<CaminoSummary[]> {
  const response = await fetch(`${API_URL}/caminos`);
  if (!response.ok) throw new Error('Failed to fetch caminos');
  return response.json() as Promise<CaminoSummary[]>;
}

export async function fetchCamino(id: string): Promise<CaminoDetailFull> {
  const response = await fetch(`${API_URL}/caminos/${id}`);
  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch camino'), { status: response.status });
  }
  return response.json() as Promise<CaminoDetailFull>;
}
