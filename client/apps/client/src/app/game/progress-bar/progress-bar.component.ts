import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerProgress } from '@type-runner/shared-types';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBarComponent {
  // list of all players with their current progress — updated live
  readonly players = input<PlayerProgress[]>([]);

  // computed signal — sorts players by progress so the leader is always on top
  readonly sortedPlayers = computed(() =>
    [...this.players()].sort((a, b) => b.progress - a.progress)
  );
}