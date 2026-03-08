import { IsString, Length } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @Length(12, 12)
  roomId: string;
}