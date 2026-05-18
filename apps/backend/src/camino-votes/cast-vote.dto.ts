import { IsBoolean } from 'class-validator';

export class CastVoteDto {
  @IsBoolean()
  vote!: boolean;
}
