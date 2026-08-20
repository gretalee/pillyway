import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { AccommodationType, PriceRange } from '@prisma/client';
import { COUNTRIES } from '../../countries/countries.constants';
import { ensureHttpProtocol } from '../../common/url.utils';

export class CreateAccommodationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @ArrayMaxSize(10)
  imageUrls?: string[];

  @IsEnum(AccommodationType)
  type: AccommodationType;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== ''
      ? ensureHttpProtocol(value.trim())
      : value,
  )
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressZip?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsIn([...COUNTRIES])
  addressCountry?: string;

  @IsOptional()
  @IsEnum(PriceRange)
  priceRange?: PriceRange;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
