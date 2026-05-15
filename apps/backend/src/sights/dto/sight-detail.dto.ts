import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SightDetailDto {
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
  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: Number })
  latitude: number | null;

  @Expose()
  @ApiPropertyOptional({ nullable: true, type: Number })
  longitude: number | null;

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
