export type { AccommodationType, PriceRange } from '../accommodations/accommodation-types';
import type { AccommodationType, PriceRange } from '../accommodations/accommodation-types';

export interface WaypointDetail {
  id: string;
  name: string;
  country: string;
  slug: string;
  description: string | null;
}

export interface CreateAccommodationPayload {
  name: string;
  description?: string;
  imageUrls?: string[];
  type: AccommodationType;
  email?: string | null;
  website?: string | null;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  priceRange?: PriceRange | null;
}

export interface CreateSightPayload {
  name: string;
  description?: string;
  imageUrls?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface UploadImagesResponse {
  urls: string[];
}
