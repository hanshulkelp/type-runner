import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerProgress } from '@type-runner/shared-types';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-room.component.html',
  styleUrl: './waiting-room.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaitingRoomComponent {
  // signal based inputs
  readonly players    = input<PlayerProgress[]>([]);
  readonly maxPlayers = input<number>(0);
  readonly roomId     = input<string>('');

  // emits when the local player clicks the ready button
  readonly playerReady = output<void>();

  // emits when the local player clicks the leave button
  readonly leaveRoom = output<void>();

  // signal — tracks if the local player has already clicked ready
  readonly isReady = signal(false);

  // signal — shows confirmation message after copying
  readonly isCopied = signal(false);

  // computed signal — true when there are not enough players to start
  readonly isWaitingForPlayers = computed(() => this.players().length < 2);

  onReadyClick(): void {
    this.isReady.set(true);
    this.playerReady.emit();
  }

  onLeaveClick(): void {
    this.leaveRoom.emit();
  }

  copyRoomId(): void {
    navigator.clipboard.writeText(this.roomId());
    this.isCopied.set(true);

    // reset the copied message after 2 seconds
    setTimeout(() => this.isCopied.set(false), 2000);
  }
}