import { IsInt, IsString, Min } from 'class-validator';

export class FinishedDto {
  // the room this player just finished in
  @IsString()
  roomId: string;

  // how long it took the player to finish in milliseconds
  @IsInt()
  @Min(0)
  timeTaken: number;

  // the full text the player typed — used to calculate final accuracy
  @IsString()
  rawInput: string;
}