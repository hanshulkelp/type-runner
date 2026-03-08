import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { RaceResult, RoomStatus, WsEvents } from '@type-runner/shared-types';
import { RoomsService, RacePlayer } from '../rooms/rooms.service';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class RaceService {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly quotesService: QuotesService,
  ) {}

  // Runs the 5 second countdown then starts the race
  async startCountdown(roomId: string, server: Server): Promise<void> {
    await this.roomsService.setStatus(roomId, RoomStatus.COUNTDOWN);

    // tick down from 5 to 1, emitting each second to all players in the room
    for (let secondsLeft = 5; secondsLeft >= 1; secondsLeft--) {
      server.to(roomId).emit(WsEvents.COUNTDOWN, { seconds: secondsLeft });
      await this.sleep(1000);
    }

    // pick a random quote and record the exact start time
    const quote     = this.quotesService.getRandomQuote();
    const startTime = Date.now();

    await this.roomsService.setRaceStarted(roomId, quote, startTime);

    // send the same quote and start time to every player simultaneously
    server.to(roomId).emit(WsEvents.RACE_START, { quote, startTime });
  }

  // Called when all players have finished typing
  async handleRaceEnd(roomId: string, server: Server): Promise<void> {
    const room = await this.roomsService.getRoom(roomId);
    if (!room) return;

    await this.roomsService.setStatus(roomId, RoomStatus.FINISHED);

    // build the final results array with positions assigned
    const results = this.assembleResults(room.players);

    server.to(roomId).emit(WsEvents.RACE_END, results);
  }

  // Builds the RaceResult array sorted by finish time, assigning positions
  private assembleResults(players: RacePlayer[]): RaceResult[] {
    return players
      // type predicate ensures TypeScript knows timeTaken is a number after this filter
      .filter((player): player is RacePlayer & { timeTaken: number } =>
        player.timeTaken !== undefined,
      )
      .sort((a, b) => a.timeTaken - b.timeTaken)
      .map((player, index) => ({
        userId:    player.userId,
        username:  player.username,
        wpm:       player.wpm,
        accuracy:  player.accuracy,
        timeTaken: player.timeTaken,
        // position is 1-based — first place is 1, not 0
        position:  index + 1,
      }));
  }

  // Calculates accuracy by comparing typed input against the original quote
  calculateAccuracy(rawInput: string, quote: string): number {
    let correctChars = 0;

    for (let i = 0; i < rawInput.length; i++) {
      if (rawInput[i] === quote[i]) correctChars++;
    }

    // round to nearest integer percentage
    return Math.round((correctChars / quote.length) * 100);
  }

  // Calculates words per minute based on chars typed and time taken
  calculateWpm(charsTyped: number, timeTakenMs: number): number {
    // standard definition: 1 word = 5 characters
    const words   = charsTyped / 5;
    const minutes = timeTakenMs / 60000;
    return Math.round(words / minutes);
  }

  // Simple promise based delay used in the countdown loop
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}