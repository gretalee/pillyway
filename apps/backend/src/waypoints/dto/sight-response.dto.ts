export interface SightResponseDto {
  id: string;
  caminoPointId: string;
  name: string;
  description: string | null;
  imageUrls: string[];
  verified: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
