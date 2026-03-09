import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomsService } from './rooms.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

interface JwtUser {
  id: string;
  username: string;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // POST /api/rooms
  @Post()
  async createRoom(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: JwtUser,
  ): Promise<{ roomId: string }> {
    const roomId = await this.roomsService.createRoom(user.id, dto.maxPlayers);
    return { roomId };
  }

  // POST /api/rooms/:id/join
  // stricter limit — max 5 join attempts per minute per IP
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post(':id/join')
  async joinRoom(
    @Param('id') roomId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const room = await this.roomsService.joinRoom(roomId, user.id, user.username);
    return room;
  }
}