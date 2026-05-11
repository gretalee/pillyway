import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Class-level constraint that rejects a request body where neither `distance`
 * nor `description` is present. A completely empty PATCH body is semantically
 * invalid — at least one field must be supplied to constitute a meaningful update.
 *
 * The constraint is attached to a phantom `_atLeastOne` property (never sent
 * by the client) with `always: true` so it fires even when the property is absent.
 */
@ValidatorConstraint({ name: 'atLeastOneStageUpdateField', async: false })
class AtLeastOneStageUpdateFieldConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    return obj['distance'] !== undefined || obj['description'] !== undefined;
  }

  defaultMessage(): string {
    return 'At least one of distance or description must be present in the request body.';
  }
}

function AtLeastOneStageUpdateField() {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: { always: true },
      validator: AtLeastOneStageUpdateFieldConstraint,
    });
  };
}

export class UpdateStageDto {
  /**
   * Phantom property that hosts the "at least one field" constraint.
   * Never present in the request body; `always: true` ensures the constraint
   * fires regardless. The whitelist retains this because it has a decorator.
   */
  @AtLeastOneStageUpdateField()
  _atLeastOne?: never;

  /**
   * Distance of this stage in kilometres. Pass `null` to clear.
   * Must be between 0.1 and 9999.9 with at most 1 decimal place.
   * The explicit `allowNaN: false` / `allowInfinity: false` flags are required
   * because `typeof NaN === 'number'` — without them NaN passes @IsNumber.
   */
  @IsOptional()
  @ValidateIf((o: UpdateStageDto) => o.distance !== null)
  @IsNumber(
    { maxDecimalPlaces: 1, allowNaN: false, allowInfinity: false },
    {
      message:
        'distance must be a number with at most 1 decimal place and cannot be NaN or Infinity.',
    },
  )
  @Min(0.1)
  @Max(9999.9)
  distance?: number | null;

  /**
   * Free-text description of this stage. Pass `null` to clear.
   */
  @IsOptional()
  @ValidateIf((o: UpdateStageDto) => o.description !== null)
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}
