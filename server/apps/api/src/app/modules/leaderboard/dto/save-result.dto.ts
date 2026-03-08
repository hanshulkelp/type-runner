import { IsInt, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';

export class SaveResultDto {
  // the user whose stats we are updating
  @IsUUID()
  userId: string;

  // words per minute achieved in this race
  @IsInt()
  @Min(0)
  wpm: number;

  // accuracy percentage for this race
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracy: number;

  // finish position — 1 means this player won the race
  @IsInt()
  @Min(1)
  position: number;
}