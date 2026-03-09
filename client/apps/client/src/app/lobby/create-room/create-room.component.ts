import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateRoomComponent {
  private readonly router     = inject(Router);
  private readonly httpClient = inject(HttpClient);

  // signal — tracks the selected max players value from the slider
  readonly maxPlayers = signal(10);

  // signal — tracks if a request is in progress to disable the button
  readonly isLoading = signal(false);

  // signal — holds any error message to show to the player
  readonly errorMessage = signal('');

  // called when the slider value changes
  onMaxPlayersChange(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.maxPlayers.set(value);
  }

  createRoom(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.httpClient
      .post<{ roomId: string }>(
        'http://localhost:3000/api/rooms',
        { maxPlayers: this.maxPlayers() },
      )
      .subscribe({
        next: response => {
          const roomId = response.roomId;

          // automatically join the room after creating it
          this.httpClient
            .post(`http://localhost:3000/api/rooms/${roomId}/join`, {})
            .subscribe({
              next: () => this.router.navigate(['/game', roomId]),
              error: () => {
                this.errorMessage.set('Failed to join room after creation.');
                this.isLoading.set(false);
              },
            });
        },
        error: () => {
          this.errorMessage.set('Failed to create room. Please try again.');
          this.isLoading.set(false);
        },
      });
  }
}