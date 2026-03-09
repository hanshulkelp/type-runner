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
import { WsEvents } from '@type-runner/shared-types';
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
  handleDisconnect(client: Socket): void {
    // clean up the throttle tracking entry for this socket
    this.progressTimestamps.delete(client.id);
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

    // socket.io room — groups sockets so we can broadcast to all players in a room
    client.join(data.roomId);

    const room = await this.roomsService.getRoom(data.roomId);
    if (!room) return;

    // send current room snapshot only to the player who just joined
    client.emit(WsEvents.ROOM_STATE, room);

    // notify all other players already in the room that someone new joined
    client.to(data.roomId).emit(WsEvents.PLAYER_JOINED, client.data['user']);
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

    // check if every player has finished
    const allFinished = updatedRoom.players.every(
      (player) => player.timeTaken !== undefined,
    );

    // end the race as soon as the last player finishes
    if (allFinished) {
      await this.raceService.handleRaceEnd(data.roomId, this.server);
    }
  }
}
