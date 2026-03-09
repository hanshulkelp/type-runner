import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsEvents, RoomStatus } from '@type-runner/shared-types';
import { RoomsService } from '../rooms/rooms.service';
import { RaceService } from './race.service';
import { ProgressDto } from './dto/progress.dto';
import { FinishedDto } from './dto/finished.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: 'http://localhost:4200' } })
export class RaceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // tracks the last progress update timestamp per socket to enforce 200ms throttle
  private readonly progressTimestamps = new Map<string, number>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly raceService: RaceService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Called automatically by NestJS when a client connects via WebSocket
  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // store verified identity server-side — never trust identity from message body
      client.data['user'] = {
        id: payload['sub'],
        username: payload['username'],
      };
    } catch {
      // invalid or expired token — disconnect immediately
      client.disconnect();
    }
  }

  // Called automatically by NestJS when a client disconnects
  async handleDisconnect(client: Socket): Promise<void> {
    this.progressTimestamps.delete(client.id);

    const roomId = client.data['roomId'] as string | undefined;
    const user   = client.data['user']   as { id: string } | undefined;
    if (!roomId || !user) return;

    await this.handlePlayerExit(client, roomId, user.id);
  }

  // checks if the client has a verified user attached
  // disconnects and returns false if the user is not authenticated
  private isAuthenticated(client: Socket): boolean {
    const hasUser = client.data['user'] !== undefined;
    if (!hasUser) client.disconnect();
    return hasUser;
  }

  // Client joins a WebSocket room channel to receive room-specific broadcast events
  @SubscribeMessage(WsEvents.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    if (!this.isAuthenticated(client)) return;

    const room = await this.roomsService.getRoom(data.roomId);
    if (!room) return;

    // reject rejoins — a refresh during a live race should send the player back to lobby
    if (room.status !== RoomStatus.WAITING) {
      client.emit(WsEvents.ROOM_REJECTED, { reason: 'Race already in progress' });
      return;
    }

    // socket.io room — groups sockets so we can broadcast to all players in a room
    client.join(data.roomId);

    // store the roomId on the socket so handleDisconnect can clean up on abrupt exit
    client.data['roomId'] = data.roomId;

    // broadcast the full room state to everyone in the room (including the new joiner)
    // this ensures all existing players see the updated player list immediately
    this.server.to(data.roomId).emit(WsEvents.ROOM_STATE, room);
  }

  // Client explicitly leaves a room — removes them from Redis and notifies others
  @SubscribeMessage(WsEvents.LEAVE_ROOM)
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    if (!this.isAuthenticated(client)) return;

    client.leave(data.roomId);
    client.data['roomId'] = undefined;

    await this.handlePlayerExit(client, data.roomId, client.data['user'].id);
  }

  // Client marks themselves as ready — race starts when all players are ready
  @SubscribeMessage(WsEvents.PLAYER_READY)
  async handlePlayerReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): Promise<void> {
    if (!this.isAuthenticated(client)) return;

    const room = await this.roomsService.markPlayerReady(
      data.roomId,
      client.data['user'].id,
    );

    const hasEnoughPlayers = room.players.length >= 2;
    const allPlayersReady = room.players.every((player) => player.ready);

    // only start countdown when there are at least 2 players and all are ready
    if (hasEnoughPlayers && allPlayersReady) {
      this.raceService.startCountdown(data.roomId, this.server);
    }
  }

  // Client sends typing progress — server enforces max one update per 200ms per socket
  @SubscribeMessage(WsEvents.PROGRESS_UPDATE)
  async handleProgressUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ProgressDto,
  ): Promise<void> {
    if (!this.isAuthenticated(client)) return;

    const now = Date.now();
    const lastUpdateAt = this.progressTimestamps.get(client.id) ?? 0;
    const hasEnoughTimePassed = now - lastUpdateAt >= 200;

    // drop updates that arrive faster than 200ms
    if (!hasEnoughTimePassed) return;
    this.progressTimestamps.set(client.id, now);

    // verify the socket's user actually belongs to this room before updating
    const room = await this.roomsService.getRoom(data.roomId);
    const isInRoom = room?.players.some(
      (player) => player.userId === client.data['user'].id,
    );
    if (!isInRoom) return;

    await this.roomsService.updateProgress(
      data.roomId,
      client.data['user'].id,
      data.charsTyped,
      data.totalChars,
    );

    const updatedRoom = await this.roomsService.getRoom(data.roomId);
    if (!updatedRoom) return;

    // broadcast updated progress of all players to everyone in the room
    this.server
      .to(data.roomId)
      .emit(WsEvents.PROGRESS_BROADCAST, updatedRoom.players);
  }

  // Client signals they finished typing the entire quote
  @SubscribeMessage(WsEvents.PLAYER_FINISHED)
  async handlePlayerFinished(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: FinishedDto,
  ): Promise<void> {
    if (!this.isAuthenticated(client)) return;

    const room = await this.roomsService.getRoom(data.roomId);
    if (!room) return;

    // calculate final stats server-side — never trust values sent from client
    const accuracy = this.raceService.calculateAccuracy(
      data.rawInput,
      room.quote ?? '',
    );
    const wpm = this.raceService.calculateWpm(
      data.rawInput.length,
      data.timeTaken,
    );

    await this.roomsService.savePlayerResult(
      data.roomId,
      client.data['user'].id,
      wpm,
      accuracy,
      data.timeTaken,
    );

    const updatedRoom = await this.roomsService.getRoom(data.roomId);
    if (!updatedRoom) return;

    // check if every non-left player has finished
    const activePlayers = updatedRoom.players.filter(p => !p.left);
    const allFinished   = activePlayers.length > 0 &&
                          activePlayers.every(p => p.timeTaken !== undefined);

    // end the race as soon as the last active player finishes
    if (allFinished) {
      await this.raceService.handleRaceEnd(data.roomId, this.server);
    }
  }
  // Shared exit logic for both explicit leave and abrupt disconnect
  // In WAITING: removes the player entirely
  // In RACING/COUNTDOWN: marks the player as left (DNF) and checks if race should end
  private async handlePlayerExit(
    client: Socket,
    roomId: string,
    userId: string,
  ): Promise<void> {
    const room = await this.roomsService.getRoom(roomId);
    if (!room) return;

    const isRacing =
      room.status === RoomStatus.RACING ||
      room.status === RoomStatus.COUNTDOWN;

    if (!isRacing) {
      // waiting room — just remove the player and refresh the list for others
      const updatedRoom = await this.roomsService.removePlayer(roomId, userId);
      if (updatedRoom) {
        this.server.to(roomId).emit(WsEvents.ROOM_STATE, updatedRoom);
      }
      return;
    }

    // mid-race — keep the player in results as DNF and check if race should end
    const updatedRoom = await this.roomsService.markPlayerLeft(roomId, userId);
    if (!updatedRoom) return;

    // broadcast updated player list so others see the "left" indicator
    this.server.to(roomId).emit(WsEvents.ROOM_STATE, updatedRoom);

    // if every remaining active player is done, end the race immediately
    const activePlayers = updatedRoom.players.filter(p => !p.left);
    const allDone =
      activePlayers.length > 0 &&
      activePlayers.every(p => p.timeTaken !== undefined);

    if (allDone) {
      await this.raceService.handleRaceEnd(roomId, this.server);
    }
  }
}