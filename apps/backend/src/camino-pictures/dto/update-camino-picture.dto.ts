import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCaminoPictureDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiProperty({
    description: 'Caption for the picture. Pass null to clear it.',
    nullable: true,
    required: false,
    maxLength: 200,
    example: 'The Cathedral of Santiago de Compostela',
  })
  label?: string | null;
}
