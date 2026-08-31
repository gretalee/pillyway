import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UploadCaminoPictureDto {
  @ApiProperty({
    description:
      'Set to "true" to upload as the primary (hero) picture, "false" for gallery.',
    type: 'string',
    enum: ['true', 'false'],
  })
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // preserve undefined/unknown so @IsDefined / @IsBoolean can reject it
  })
  @IsDefined({ message: 'isPrimary must be "true" or "false"' })
  @IsBoolean()
  isPrimary: boolean;

  @ApiPropertyOptional({
    description:
      'Optional display name for the picture. Sanitized into the S3 key ' +
      '(German umlauts transliterated, other characters replaced) and always ' +
      'combined with a unique suffix so it can never overwrite an existing ' +
      'image. If omitted, a filename is generated, as before.',
    example: 'Blick auf Roncesvalles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
