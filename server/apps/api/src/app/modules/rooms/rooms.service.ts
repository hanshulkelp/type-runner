import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PlayerProgress, RoomStatus } from '@type-runner/shared-types';
import { RedisService } from '../redis/redis.service';

// Extends PlayerProgress with server-side only fields not needed by the client
export interface RacePlayer extends PlayerProgress {
  ready:      boolean; // tracks if player clicked ready in waiting room
  timeTaken?: number;  // only set when the player has finished typing
}

// Shape of a room stored in Redis
interface RoomState {
  roomId:     string;
  hostId:     string;
  status:     RoomStatus;
  players:    RacePlayer[];
  quote:      string | null;
  startTime:  number | null;
  maxPlayers: number;
}

@Injectable()
export class RoomsService {
  // Redis TTL for rooms — 2 hours in seconds
  private readonly ROOM_TTL = 7200;

  constructor(private readonly redisService: RedisService) {}

  // Builds the Redis key for a given room
  private roomKey(roomId: string): string {
    return `room:${roomId}`;
  }

  // Fetches and parses room state from Redis
  // Returns null if the room does not exist
  async getRoom(roomId: string): Promise<RoomState | null> {
    const data = await this.redisService.get(this.roomKey(roomId));
    if (!data) return null;
    return JSON.parse(data) as RoomState;
  }

  // Saves room state back to Redis, resetting the TTL
  private async saveRoom(room: RoomState): Promise<void> {
    await this.redisService.set(
      this.roomKey(room.roomId),
      JSON.stringify(room),
      this.ROOM_TTL,
    );
  }

  // Creates a new room in Redis and returns the generated room ID
  async createRoom(hostId: string, maxPlayers: number): Promise<string> {
    const roomId = nanoid(12);

    const room: RoomState = {
      roomId,
      hostId,
      maxPlayers,
      status:    RoomStatus.WAITING,
      players:   [],
      quote:     null,
      startTime: null,
    };

    await this.saveRoom(room);
    return roomId;
  }

  // Adds a player to the room's player list
  // Throws if room doesn't exist, is already started, or is full
  async joinRoom(roomId: string, userId: string, username: string): Promise<RoomState> {
    const room = await this.getRoom(roomId);

    if (!room) throw new NotFoundException('Room not found');

    if (room.status !== RoomStatus.WAITING) {
      throw new BadRequestException('Race has already started');
    }

    const isRoomFull = room.players.length >= room.maxPlayers;
    if (isRoomFull) throw new BadRequestException('Room is full');

    room.players.push({
      userId,
      username,
      progress:  0,
      wpm:       0,
      accuracy:  0,
      ready:     false,
    });

    await this.saveRoom(room);
    return room;
  }

  // Marks a specific player as ready
  async markPlayerReady(roomId: string, userId: string): Promise<RoomState> {
    const room = await this.getRoom(roomId);
    if (!room) throw new NotFoundException('Room not found');

    const player = room.players.find(p => p.userId === userId);
    if (player) player.ready = true;

    await this.saveRoom(room);
    return room;
  }

  // Updates a player's typing progress (charsTyped / totalChars = percentage)
  async updateProgress(
    roomId: string,
    userId: string,
    charsTyped: number,
    totalChars: number,
  ): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.userId === userId);
    if (!player) return;

    // calculate percentage completion rounded to nearest integer
    player.progress = Math.round((charsTyped / totalChars) * 100);

    await this.saveRoom(room);
  }

  // Changes the room status (WAITING → COUNTDOWN → RACING → FINISHED)
  async setStatus(roomId: string, status: RoomStatus): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;

    room.status = status;
    await this.saveRoom(room);
  }

  // Assigns the quote and records the race start timestamp
  async setRaceStarted(roomId: string, quote: string, startTime: number): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;

    room.quote     = quote;
    room.startTime = startTime;
    room.status    = RoomStatus.RACING;

    await this.saveRoom(room);
  }

  // Saves a player's final stats when they finish typing the quote
  async savePlayerResult(
    roomId: string,
    userId: string,
    wpm: number,
    accuracy: number,
    timeTaken: number,
  ): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.userId === userId);
    if (!player) return;

    player.wpm      = wpm;
    player.accuracy = accuracy;

    // setting timeTaken marks this player as finished
    player.timeTaken = timeTaken;

    await this.saveRoom(room);
  }
}