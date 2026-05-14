export interface AccommodationSummary {
  id: string;
  caminoPointId: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  verified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SightSummary {
  id: string;
  caminoPointId: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  verified: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaypointDetail {
  id: string;
  name: string;
  country: string;
  slug: string;
  description: string | null;
  accommodations: AccommodationSummary[];
  sights: SightSummary[];
}

export interface CreateAccommodationPayload {
  name: string;
  description?: string;
  imageUrls?: string[];
}

export interface CreateSightPayload {
  name: string;
  description?: string;
  imageUrls?: string[];
}

export interface UploadImagesResponse {
  urls: string[];
}
