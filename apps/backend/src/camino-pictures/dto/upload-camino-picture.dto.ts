import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsDefined } from 'class-validator';

export class UploadCaminoPictureDto {
  @ApiProperty({
    description: 'Set to "true" to upload as the primary (hero) picture, "false" for gallery.',
    type: 'string',
    enum: ['true', 'false'],
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // preserve undefined/unknown so @IsDefined / @IsBoolean can reject it
  })
  @IsDefined({ message: 'isPrimary must be "true" or "false"' })
  @IsBoolean()
  isPrimary: boolean;
}
