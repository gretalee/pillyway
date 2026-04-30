import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { CaminoPointItemDto } from './camino-point-item.dto';

export class CreateCaminoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  /**
   * Ordered list of waypoints. Positions are derived from array index (0-based
   * → stored as 1-based). Each element must satisfy the XOR constraint defined
   * in CaminoPointItemDto: either { caminoPointId } OR { name, country }.
   *
   * `verified` is intentionally absent — it defaults to false in the DB and
   * must not be writable by the client. The global ValidationPipe whitelist
   * will strip any `verified` field sent in the request body.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CaminoPointItemDto)
  caminoPoints!: CaminoPointItemDto[];
}
