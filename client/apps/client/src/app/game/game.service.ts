import {
  Injectable,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlayerProgress, RaceResult, WsEvents } from '@type-runner/shared-types';
import { SocketService } from '../core/socket/socket.service';

// Shape of the room state received from the server
export interface RoomState {
  roomId:     string;
  hostId:     string;
  status:     string;
  players:    PlayerProgress[];
  quote:      string | null;
  startTime:  number | null;
  maxPlayers: number;
}

// Shape of the race start event received from the server
export interface RaceStartData {
  quote:     string;
  startTime: number;
}

@Injectable()
export class GameService {
  private readonly socketService = inject(SocketService);
  private readonly destroyRef    = inject(DestroyRef);

  // signals holding the latest state for each phase of the game
  readonly roomState   = signal<RoomState | null>(null);
  readonly allProgress = signal<PlayerProgress[]>([]);
  readonly countdown   = signal<number | null>(null);
  readonly raceStart   = signal<RaceStartData | null>(null);
  readonly raceEnd     = signal<RaceResult[] | null>(null);

  // signal — true when the server rejects entry (e.g. joining a room mid-race via refresh)
  readonly rejected    = signal(false);

  // computed signal — derives the current game phase from the state signals
  readonly phase = computed<'waiting' | 'countdown' | 'racing' | 'results'>(() => {
    if (this.raceEnd())   return 'results';
    if (this.raceStart()) return 'racing';
    if (this.countdown()) return 'countdown';
    return 'waiting';
  });

  // subscribes to all WebSocket events and pushes data into signals
  // call this once when the game component initializes
  initListeners(): void {
    this.socketService.on<RoomState>(WsEvents.ROOM_STATE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(state => this.roomState.set(state));

    this.socketService.on<PlayerProgress[]>(WsEvents.PROGRESS_BROADCAST)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(progress => this.allProgress.set(progress));

    this.socketService.on<{ seconds: number }>(WsEvents.COUNTDOWN)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.countdown.set(data.seconds));

    this.socketService.on<RaceStartData>(WsEvents.RACE_START)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => this.raceStart.set(data));

    this.socketService.on<RaceResult[]>(WsEvents.RACE_END)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(results => this.raceEnd.set(results));

    this.socketService.on<{ reason: string }>(WsEvents.ROOM_REJECTED)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.rejected.set(true));
  }

  // resets all signals — called when leaving the game page
  resetState(): void {
    this.roomState.set(null);
    this.allProgress.set([]);
    this.countdown.set(null);
    this.raceStart.set(null);
    this.raceEnd.set(null);
    this.rejected.set(false);
  }
}