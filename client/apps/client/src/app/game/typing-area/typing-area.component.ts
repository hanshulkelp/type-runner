import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Shape of a progress update sent to the server
export interface ProgressUpdate {
  charsTyped: number;
  totalChars: number;
}

// Shape of a finish event sent to the server
export interface FinishEvent {
  timeTaken: number;
  rawInput:  string;
}

@Component({
  selector: 'app-typing-area',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './typing-area.component.html',
  styleUrl: './typing-area.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypingAreaComponent implements OnInit {
  // signal based inputs
  readonly quote     = input<string>('');
  readonly startTime = input<number>(0);

  // signal based outputs
  readonly progressUpdate = output<ProgressUpdate>();
  readonly raceFinished   = output<FinishEvent>();

  // signal holding the text the player has typed so far
  readonly typedText = signal('');

  // computed signal — splits the quote into characters for highlighting
  readonly quoteChars = computed(() => this.quote().split(''));

  // computed signal — precomputes css class for every character reactively
  readonly charClasses = computed(() =>
    this.quoteChars().map((_, index) => this.getCharClass(index))
  );

  // used to push raw input events into the throttled stream
  private readonly typingSubject = new Subject<string>();

  // tracks if the player has already finished to prevent duplicate finish events
  private hasFinished = false;

  // inject DestroyRef — takeUntilDestroyed uses it to clean up automatically
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.typingSubject.pipe(
      // max one progress update per 200ms — mirrors server side throttle
      auditTime(200),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(text => {
      const charsTyped = this.countCorrectChars(text);
      const totalChars = this.quote().length;

      this.progressUpdate.emit({ charsTyped, totalChars });

      // check if the player has typed the full quote correctly
      const hasCompletedQuote = text === this.quote();
      if (hasCompletedQuote && !this.hasFinished) {
        this.hasFinished = true;
        this.raceFinished.emit({
          timeTaken: Date.now() - this.startTime(),
          rawInput:  text,
        });
      }
    });
  }

  // Called on every keystroke — updates signal and pushes into throttled stream
  onInput(event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value;
    this.typedText.set(inputValue);
    this.typingSubject.next(inputValue);
  }

  // Returns the correct CSS class for each character based on what the player typed
  getCharClass(index: number): 'correct' | 'wrong' | 'pending' {
    if (index >= this.typedText().length) return 'pending';
    return this.typedText()[index] === this.quote()[index] ? 'correct' : 'wrong';
  }

  // Counts how many characters match the quote so far
  private countCorrectChars(typed: string): number {
    let correctCount = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === this.quote()[i]) correctCount++;
    }
    return correctCount;
  }
}