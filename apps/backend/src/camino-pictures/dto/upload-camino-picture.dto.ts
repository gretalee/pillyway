import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UploadCaminoPictureDto {
  /**
   * Whether the uploaded image should become the primary (hero) picture.
   * Arrives as a string in multipart/form-data; transformed to a boolean before validation.
   * Use the string literal "true" or "false" — @IsBoolean({ strict: false }) is intentionally
   * NOT used because it coerces the string "false" to true.
   */
  @ApiProperty({
    description: 'Set to "true" to upload as the primary (hero) picture, "false" for gallery.',
    type: 'string',
    enum: ['true', 'false'],
  })
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPrimary: boolean;
}
