export interface CaminoGpxFile {
  id: string;
  caminoId: string;
  uploadedBy: string; // Kinde user ID — used for frontend delete-permission check
  uploaderName: string;
  fileName: string;
  createdAt: string;
}
