import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindAllCaminosQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // preserve unknown so @IsBoolean can reject it
  })
  @IsBoolean()
  verified?: boolean;

  // Accepts a comma-separated string: "france,spain" → ["france", "spain"]
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = String(value)
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    return arr.length ? arr : undefined;
  })
  @IsArray()
  @IsString({ each: true })
  countries?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
