import { IsInt, IsString, Min } from 'class-validator';

export class ProgressDto {
  // the room this progress update belongs to
  @IsString()
  roomId: string;

  // how many characters the player has typed correctly so far
  @IsInt()
  @Min(0)
  charsTyped: number;

  // total characters in the quote — used to calculate percentage
  @IsInt()
  @Min(1)
  totalChars: number;
}