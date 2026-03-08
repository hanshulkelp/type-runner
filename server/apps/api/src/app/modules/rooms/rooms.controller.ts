import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
// import { JoinRoomDto } from './dto/join-room.dto';
import { RoomsService } from './rooms.service';

// Shape of the JWT payload attached to the request by JwtAuthGuard
interface JwtUser {
  id: string;
  username: string;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard) // every route in this controller requires a valid JWT
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // POST /api/rooms
  // Creates a new room and returns the generated room ID
  @Post()
  async createRoom(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ roomId: string }> {
    const roomId = await this.roomsService.createRoom(user.id, dto.maxPlayers);
    return { roomId };
  }

  // POST /api/rooms/:id/join
  // Adds the current user to an existing room
  @Post(':id/join')
  async joinRoom(
    @Param('id') roomId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const room = await this.roomsService.joinRoom(roomId, user.id, user.username);
    return room;
  }
}