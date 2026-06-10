import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import { AccommodationType, PriceRange } from '@prisma/client';

export class AccommodationDetailDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  caminoPointId: string;

  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @Expose()
  @ApiProperty({ type: [String] })
  imageUrls: string[];

  @Expose()
  @ApiProperty()
  verified: boolean;

  @Expose()
  @ApiProperty({ enum: AccommodationType })
  type: AccommodationType;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  website: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  addressStreet: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  addressZip: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  addressCity: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  addressCountry: string | null;

  @Expose()
  @ApiPropertyOptional({ enum: PriceRange, nullable: true })
  priceRange: PriceRange | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @Expose()
  @ApiProperty()
  waypointSlug: string;

  @Expose()
  @ApiProperty()
  createdBy: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;
}
