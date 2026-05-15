import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { AccommodationType, PriceRange } from '@prisma/client';

export class UpdateAccommodationDto {
  @IsOptional()
  @IsString()
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
    description: 'URLs to remove from imageUrls. Mutually exclusive with imageUrls.',
  })
  removeImageUrls?: string[];

  @IsOptional()
  @IsEnum(AccommodationType)
  @ApiPropertyOptional({ enum: AccommodationType })
  type?: AccommodationType;

  @IsOptional()
  @IsEmail()
  @ApiPropertyOptional()
  email?: string;

  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional()
  website?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  addressZip?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  addressCity?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  addressCountry?: string;

  @IsOptional()
  @IsEnum(PriceRange)
  @ApiPropertyOptional({ enum: PriceRange })
  priceRange?: PriceRange;

  /**
   * Validates business rules that cannot be expressed as field-level decorators:
   * - Body must contain at least one field.
   * - imageUrls and removeImageUrls are mutually exclusive.
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
  }
}
