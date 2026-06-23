export interface WaypointDetailDto {
  id: string;
  name: string;
  country: string;
  slug: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
}
