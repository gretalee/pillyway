export type AccommodationType =
  | 'hostel'
  | 'monastery'
  | 'b_and_b'
  | 'hotel'
  | 'apartment'
  | 'private_room'
  | 'church';

export type PriceRange = 'budget' | 'moderate' | 'comfortable' | 'luxury';

export interface AccommodationDetail {
  id: string;
  caminoPointId: string;
  waypointSlug: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  verified: boolean;
  type: AccommodationType;
  email: string | null;
  website: string | null;
  phone: string | null;
  addressStreet: string | null;
  addressZip: string | null;
  addressCity: string | null;
  addressCountry: string | null;
  priceRange: PriceRange | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAccommodationPayload {
  name?: string;
  description?: string | null;
  imageUrls?: string[];
  removeImageUrls?: string[];
  type?: AccommodationType;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  addressStreet?: string | null;
  addressZip?: string | null;
  addressCity?: string | null;
  addressCountry?: string | null;
  priceRange?: PriceRange | null;
}
