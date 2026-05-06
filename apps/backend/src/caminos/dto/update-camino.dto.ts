import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationArguments,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { CaminoPointItemDto } from './camino-point-item.dto';

/**
 * Class-level constraint that rejects a request body where none of the three
 * allowed fields (name, description, caminoPoints) are present. A completely
 * empty PATCH body is semantically invalid — at least one field must be
 * supplied to constitute a meaningful update.
 *
 * The constraint is attached to a phantom `_atLeastOne` property (never sent
 * by the client) with `always: true` so it fires even when the property is
 * absent.
 */
@ValidatorConstraint({ name: 'atLeastOneUpdateField', async: false })
class AtLeastOneUpdateFieldConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    return (
      obj['name'] !== undefined ||
      obj['description'] !== undefined ||
      obj['caminoPoints'] !== undefined
    );
  }

  defaultMessage(): string {
    return 'At least one of name, description, or caminoPoints must be present in the request body.';
  }
}

function AtLeastOneUpdateField() {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: { always: true },
      validator: AtLeastOneUpdateFieldConstraint,
    });
  };
}

export class UpdateCaminoDto {
  /**
   * Phantom property that hosts the "at least one field" constraint.
   * Never present in the request body; `always: true` ensures the constraint
   * fires regardless. The whitelist retains this because it has a decorator.
   */
  @AtLeastOneUpdateField()
  _atLeastOne?: never;

  /** New name for the camino. Case-insensitive uniqueness is enforced in the service. */
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @IsOptional()
  name?: string;

  /**
   * New description for the camino. Pass `null` explicitly to clear an
   * existing description. Omitting the field leaves the description unchanged.
   */
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string | null;

  /**
   * Full replacement waypoint list. When present, all existing CaminoPointOrder
   * rows for this camino are deleted and re-created from this payload inside a
   * single Prisma transaction. Each item follows the same XOR constraint as
   * CreateCaminoDto: either { caminoPointId } or { name, country, description? }.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaminoPointItemDto)
  @IsOptional()
  caminoPoints?: CaminoPointItemDto[];
}
