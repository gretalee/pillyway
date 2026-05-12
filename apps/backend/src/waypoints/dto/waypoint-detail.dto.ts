import { AccommodationResponseDto } from './accommodation-response.dto';
import { SightResponseDto } from './sight-response.dto';

export interface WaypointDetailDto {
  id: string;
  name: string;
  country: string;
  slug: string;
  description: string | null;
  accommodations: AccommodationResponseDto[];
  sights: SightResponseDto[];
}
