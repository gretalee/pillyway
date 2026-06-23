import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateWaypointDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiPropertyOptional({ type: String })
  name?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiPropertyOptional({ type: Number, nullable: true })
  lat?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiPropertyOptional({ type: Number, nullable: true })
  lng?: number | null;
}
