import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// Shape of a single leaderboard row returned from the server
interface LeaderboardRow {
  bestWpm:     number;
  avgAccuracy: string;
  racesPlayed: number;
  wins:        number;
  user: {
    username: string;
  };
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leaderboard.component.html',
    styleUrl: './leaderboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaderboardComponent implements OnInit {
  private readonly httpClient = inject(HttpClient);

  // signal — holds the leaderboard rows fetched from the server
  readonly rows = signal<LeaderboardRow[]>([]);

  // signal — tracks if the request is in progress
  readonly isLoading = signal(true);

  // signal — holds any error message if the fetch fails
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.httpClient
      .get<LeaderboardRow[]>('http://localhost:3000/api/leaderboard')
      .subscribe({
        next: data => {
          this.rows.set(data);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('Failed to load leaderboard.');
          this.isLoading.set(false);
        },
      });
  }
}