export interface AccommodationResponseDto {
  id: string;
  caminoPointId: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  verified: boolean;
  phone: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
