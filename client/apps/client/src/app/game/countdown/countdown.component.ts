import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './countdown.component.html',
  styleUrls: ['./countdown.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountdownComponent {
  // current countdown value — changes every second from 5 down to 1
  readonly seconds = input<number | null>(null);
}