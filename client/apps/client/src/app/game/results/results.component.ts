import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RaceResult } from '@type-runner/shared-types';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results.component.html',
  styleUrl: './results.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultsComponent {
  private readonly router = inject(Router);

  // final race results received from the server
  readonly results = input<RaceResult[]>([]);

  // computed signal — ensures results are always sorted by position
  readonly sortedResults = computed(() =>
    [...this.results()].sort((a, b) => a.position - b.position)
  );

  // converts milliseconds to a readable format like "32.5s"
  formatTime(ms: number): string {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  goToLobby(): void {
    this.router.navigate(['/lobby/create']);
  }

  goToLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }
}