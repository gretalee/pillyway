export interface CaminoPrimaryPicture {
  id: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export interface CaminoGalleryPicture {
  id: string;
  url: string;
  uploadedBy: string;
  position: number;
  label: string | null;
  createdAt: string;
}

export interface CaminoPicturesResponse {
  primary: CaminoPrimaryPicture | null;
  gallery: CaminoGalleryPicture[];
}

export interface UploadCaminoPictureResult {
  id: string;
  caminoId: string;
  url: string;
  isPrimary: boolean;
  position: number | null;
  label: string | null;
  uploadedBy: string;
  createdAt: string;
}
