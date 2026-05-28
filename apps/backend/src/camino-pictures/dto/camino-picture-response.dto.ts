import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CaminoPictureResponseDto {
  @Expose()
  @ApiProperty({ description: 'UUID of the picture record.' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'UUID of the camino this picture belongs to.' })
  caminoId: string;

  @Expose()
  @ApiProperty({ description: 'Public S3 URL of the image.' })
  url: string;

  @Expose()
  @ApiProperty({ description: 'Whether this is the primary (hero) picture.' })
  isPrimary: boolean;

  @Expose()
  @ApiProperty({
    description: 'Sort position within the gallery (null for the primary picture).',
    nullable: true,
  })
  position: number | null;

  @Expose()
  @ApiProperty({
    description: 'Optional caption for the picture.',
    nullable: true,
  })
  label: string | null;

  @Expose()
  @ApiProperty({ description: 'Kinde user ID of the uploader.' })
  uploadedBy: string;

  @Expose()
  @ApiProperty({ description: 'ISO 8601 timestamp of record creation.' })
  createdAt: Date;
}

@Exclude()
export class CaminoPicturesResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Primary (hero) picture, or null if none has been uploaded.',
    type: () => CaminoPictureResponseDto,
    nullable: true,
  })
  primary: CaminoPictureResponseDto | null;

  @Expose()
  @ApiProperty({
    description: 'Gallery pictures ordered by position ascending.',
    type: () => [CaminoPictureResponseDto],
  })
  gallery: CaminoPictureResponseDto[];
}
