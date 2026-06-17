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

  @ApiProperty({
    description: "Uploader's display name from the client (max 200 chars, no newlines).",
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[^\r\n]+$/, { message: 'uploaderName must not contain newline characters' })
  uploaderName: string;
}
