export interface SightDetail {
  id: string;
  caminoPointId: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  verified: boolean;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSightPayload {
  name?: string;
  description?: string | null;
  imageUrls?: string[];
  removeImageUrls?: string[];
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
