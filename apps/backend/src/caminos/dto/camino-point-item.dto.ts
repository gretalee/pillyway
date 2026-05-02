import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { COUNTRIES } from '../../countries/countries.constants';

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
export class XorCaminoPointItemConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    // treat null the same as absent — caminoPointId must be a non-null string
    const hasRef =
      obj['caminoPointId'] !== undefined && obj['caminoPointId'] !== null;
    const hasDef =
      (obj['name'] !== undefined && obj['name'] !== null) ||
      (obj['country'] !== undefined && obj['country'] !== null);

    if (hasRef && hasDef) return false; // both branches present
    if (!hasRef && !hasDef) return false; // neither branch present

    // New-point branch: name and country must be non-empty strings
    if (!hasRef) {
      if (typeof obj['name'] !== 'string' || obj['name'].trim().length === 0)
        return false;
      if (
        typeof obj['country'] !== 'string' ||
        obj['country'].trim().length === 0
      )
        return false;
    }

    return true;
  }

  defaultMessage(): string {
    return (
      'Each caminoPoint must be either { caminoPointId: "<uuid>" } (existing-point ref) ' +
      'or { name: "<non-empty>", country: "<non-empty>", description? } (new-point definition), ' +
      'never both and never neither. caminoPointId must not be null.'
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

  @IsIn([...COUNTRIES])
  @IsOptional()
  country?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;
}
