import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateSightDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @ApiPropertyOptional()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiPropertyOptional()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  @ApiPropertyOptional({ type: [String] })
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    type: [String],
    description:
      'URLs to remove from imageUrls. Mutually exclusive with imageUrls.',
  })
  removeImageUrls?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  address?: string;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ type: Number })
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({ type: Number })
  longitude?: number;

  /**
   * Validates business rules that cannot be expressed as field-level decorators:
   * - Body must contain at least one field.
   * - imageUrls and removeImageUrls are mutually exclusive.
   * - latitude and longitude must be provided together or both omitted.
   *
   * Called by the service before processing. Throws BadRequestException if
   * any rule is violated.
   */
  assertValid(): void {
    const hasAnyField = Object.keys(this).some(
      (k) => (this as Record<string, unknown>)[k] !== undefined,
    );
    if (!hasAnyField) {
      throw new BadRequestException('Request body must not be empty');
    }

    if (this.imageUrls !== undefined && this.removeImageUrls !== undefined) {
      throw new BadRequestException(
        'imageUrls and removeImageUrls are mutually exclusive',
      );
    }

    const hasLat = this.latitude !== undefined && this.latitude !== null;
    const hasLon = this.longitude !== undefined && this.longitude !== null;
    if (hasLat !== hasLon) {
      throw new BadRequestException(
        'Both latitude and longitude must be provided together or both omitted',
      );
    }
  }
}
