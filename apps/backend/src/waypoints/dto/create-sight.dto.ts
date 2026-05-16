import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Validates that latitude and longitude are always provided together.
 * If one is set, the other must also be set.
 */
function RequireBothCoordinates(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'requireBothCoordinates',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const lat = obj['latitude'];
          const lon = obj['longitude'];
          // Both undefined/null → valid (both omitted)
          const hasLat = lat !== undefined && lat !== null;
          const hasLon = lon !== undefined && lon !== null;
          return hasLat === hasLon;
        },
        defaultMessage() {
          return 'Both latitude and longitude must be provided together or both omitted';
        },
      },
    });
  };
}

export class CreateSightDto {
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

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  @RequireBothCoordinates()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @RequireBothCoordinates()
  longitude?: number;
}
