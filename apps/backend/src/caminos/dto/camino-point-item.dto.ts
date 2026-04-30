import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Enforces XOR: each caminoPoint must be either
 *   { caminoPointId }                          — existing-point reference
 *   { name, country, description? }            — new-point definition
 * Never both, never neither.
 *
 * Attached as a class-level decorator so it fires after all field-level
 * validators and has access to the whole object via args.object.
 */
@ValidatorConstraint({ name: 'xorCaminoPointItem', async: false })
export class XorCaminoPointItemConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const hasRef = obj['caminoPointId'] !== undefined;
    const hasDef =
      obj['name'] !== undefined || obj['country'] !== undefined;
    // XOR: exactly one branch must be present
    return hasRef !== hasDef;
  }

  defaultMessage(): string {
    return (
      'Each caminoPoint must be either an existing-point ref ' +
      '({ caminoPointId }) or a new-point definition ' +
      '({ name, country, description? }), never both and never neither.'
    );
  }
}

/**
 * Factory decorator that attaches XorCaminoPointItemConstraint to any
 * property on a class. The `always: true` option ensures the constraint
 * runs even when the property value is undefined — which it always is for
 * the phantom `_xor` field below.
 */
function ValidateCaminoPointItem() {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: { always: true },
      validator: XorCaminoPointItemConstraint,
    });
  };
}

export class CaminoPointItemDto {
  /**
   * Phantom property that hosts the class-level XOR constraint.
   * It is never present in the request body; `always: true` in registerDecorator
   * ensures the constraint fires regardless. The ValidationPipe whitelist
   * retains this field because it has a class-validator decorator.
   */
  @ValidateCaminoPointItem()
  _xor?: never;

  @IsUUID()
  @IsOptional()
  caminoPointId?: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  country?: string;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
