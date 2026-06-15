import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class CaminoGpxFileResponseDto {
  @Expose()
  @ApiProperty({ description: 'UUID of the GPX file record.' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'UUID of the camino this file belongs to.' })
  caminoId: string;

  @Expose()
  @ApiProperty({ description: 'Kinde user ID of the uploader (opaque string).' })
  uploadedBy: string;

  @Expose()
  @ApiProperty({ description: 'Display name of the uploader at upload time.' })
  uploaderName: string;

  @Expose()
  @ApiProperty({ description: 'User-supplied display name for the file.' })
  fileName: string;

  @Expose()
  @ApiProperty({ description: 'ISO 8601 timestamp of record creation.' })
  createdAt: Date;

  // storageKey intentionally NOT exposed — internal S3 key
}
