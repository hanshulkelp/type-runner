import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-join-room',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './join-room.component.html',
    styleUrl: './join-room.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRoomComponent {
  private readonly router     = inject(Router);
  private readonly httpClient = inject(HttpClient);

  // signal — tracks the room ID typed by the player
  readonly roomId = signal('');

  // signal — tracks if a request is in progress to disable the button
  readonly isLoading = signal(false);

  // signal — holds any error message to show to the player
  readonly errorMessage = signal('');

  // called when the room ID input changes
  onRoomIdChange(value: string): void {
    this.roomId.set(value);
  }

  joinRoom(): void {
    // trim whitespace — players often accidentally add spaces
    const trimmedRoomId = this.roomId().trim();

    if (!trimmedRoomId) {
      this.errorMessage.set('Please enter a room ID.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.httpClient
      .post(
        `http://localhost:3000/api/rooms/${trimmedRoomId}/join`,
        {},
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/game', trimmedRoomId]);
        },
        error: (err) => {
          const message = err.error?.message ?? 'Failed to join room. Please try again.';
          this.errorMessage.set(message);
          this.isLoading.set(false);
        },
      });
  }
}