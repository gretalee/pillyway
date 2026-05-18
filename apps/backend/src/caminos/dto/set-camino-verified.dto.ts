import { IsBoolean } from 'class-validator';

export class SetCaminoVerifiedDto {
  @IsBoolean()
  verified!: boolean;
}
