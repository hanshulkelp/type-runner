import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WsEvents } from '@type-runner/shared-types';
import { SocketService } from '../core/socket/socket.service';
import { GameService } from './game.service';
import { WaitingRoomComponent } from './waiting-room/waiting-room.component';
import { CountdownComponent } from './countdown/countdown.component';
import { TypingAreaComponent, ProgressUpdate, FinishEvent } from './typing-area/typing-area.component';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { ResultsComponent } from './results/results.component';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [
    CommonModule,
    WaitingRoomComponent,
    CountdownComponent,
    TypingAreaComponent,
    ProgressBarComponent,
    ResultsComponent,
  ],
  templateUrl: './game.component.html',
  styleUrl: './game.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
  private readonly route         = inject(ActivatedRoute);
  private readonly router        = inject(Router);
  private readonly socketService = inject(SocketService);
  readonly gameService           = inject(GameService);

  // room ID read from the URL — /game/:roomId
  roomId = '';

  constructor() {
    // effect runs in injection context — watches the rejected signal and redirects
    // this handles page refreshes mid-race, where the server rejects the JOIN_ROOM
    effect(() => {
      if (this.gameService.rejected()) {
        this.router.navigate(['/lobby']);
      }
    });
  }

  ngOnInit(): void {
    // reset any stale state from a previous race before setting up the new one
    this.gameService.resetState();

    this.roomId = this.route.snapshot.params['roomId'];

    // get the stored token and connect the socket
    const token = localStorage.getItem('access_token') ?? '';
    this.socketService.connect(token);

    // start listening to all websocket events
    this.gameService.initListeners();

    // join the websocket room channel
    this.socketService.emit(WsEvents.JOIN_ROOM, { roomId: this.roomId });
  }

  // called when the player clicks ready in the waiting room
  onPlayerReady(): void {
    this.socketService.emit(WsEvents.PLAYER_READY, { roomId: this.roomId });
  }

  // called every 200ms while the player is typing
  onProgressUpdate(update: ProgressUpdate): void {
    this.socketService.emit(WsEvents.PROGRESS_UPDATE, {
      roomId:     this.roomId,
      charsTyped: update.charsTyped,
      totalChars: update.totalChars,
    });
  }

  // called when the player finishes typing the full quote
  onRaceFinished(event: FinishEvent): void {
    this.socketService.emit(WsEvents.PLAYER_FINISHED, {
      roomId:    this.roomId,
      timeTaken: event.timeTaken,
      rawInput:  event.rawInput,
    });
  }

  // called when Angular destroys this component — covers all navigation paths
  // (leave button, race again, browser back, etc.)
  ngOnDestroy(): void {
    this.socketService.emit(WsEvents.LEAVE_ROOM, { roomId: this.roomId });
    this.socketService.disconnect();
    this.gameService.resetState();
  }

  // called when the player explicitly clicks the leave button
  // emits LEAVE_ROOM immediately then lets ngOnDestroy handle the rest
  onLeaveRoom(): void {
    this.router.navigate(['/lobby']);
  }
}