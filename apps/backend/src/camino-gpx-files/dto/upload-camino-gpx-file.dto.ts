import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UploadCaminoGpxFileDto {
  @ApiProperty({
    description: 'User-supplied display name for the GPX file (max 100 chars, no newlines).',
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[^\r\n]+$/, { message: 'fileName must not contain newline characters' })
  fileName: string;
}
