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
  rawInput: string;
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
  readonly quote = input<string>('');
  readonly startTime = input<number>(0);

  // signal based outputs
  readonly progressUpdate = output<ProgressUpdate>();
  readonly raceFinished = output<FinishEvent>();

  // signal holding the text the player has typed so far
  readonly typedText = signal('');

  // signal — number of characters typed incorrectly on first attempt (never decremented)
  readonly firstAttemptErrors = signal(0);

  // tracks how far the user has typed so far; only positions beyond this are "new"
  private firstAttemptEvalEnd = 0;

  // computed signal — splits the quote into characters for highlighting
  readonly quoteChars = computed(() => this.quote().split(''));

  // computed signal — word-aligned character classes
  // a mistake in word N never bleeds into word N+1 because each word's
  // comparison starts fresh from the typed word at that position
  readonly charClasses = computed((): ('correct' | 'wrong' | 'pending')[] => {
    const quote = this.quote();
    const typed = this.typedText();
    const quoteWords = quote.split(' ');
    const typedWords = typed.split(' ');
    const result: ('correct' | 'wrong' | 'pending')[] = [];

    for (let wi = 0; wi < quoteWords.length; wi++) {
      const qw = quoteWords[wi];
      const tw = typedWords[wi] ?? '';

      // has the user reached this word yet?
      const wordReached = typedWords.length > wi;
      // has the user moved past this word (pressed space after it)?
      const wordPast = typedWords.length > wi + 1;

      for (let ci = 0; ci < qw.length; ci++) {
        if (!wordReached) {
          result.push('pending');
        } else if (ci >= tw.length) {
          // character position not yet filled — wrong only if user left the word
          result.push(wordPast ? 'wrong' : 'pending');
        } else {
          result.push(tw[ci] === qw[ci] ? 'correct' : 'wrong');
        }
      }

      // space between words (not after the last word)
      if (wi < quoteWords.length - 1) {
        const spaceIndex = quoteWords.slice(0, wi + 1).join(' ').length;
        result.push(spaceIndex < typed.length ? 'correct' : 'pending');
      }
    }

    return result;
  });

  // computed signal — character-based first-attempt accuracy, irreversible
  // once a position is typed incorrectly it stays wrong even if later corrected
  readonly liveAccuracy = computed(() => {
    const totalChars = this.quote().length;
    const errors = this.firstAttemptErrors();
    return Math.max(0, Math.round(((totalChars - errors) / totalChars) * 100));
  });

  // used to push raw input events into the throttled stream
  private readonly typingSubject = new Subject<string>();

  // tracks if the player has already finished to prevent duplicate finish events
  private hasFinished = false;

  // inject DestroyRef — takeUntilDestroyed uses it to clean up automatically
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.typingSubject
      .pipe(
        // max one progress update per 200ms — mirrors server side throttle
        auditTime(200),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((text) => {
        const charsTyped = this.countCorrectChars(text);
        const totalChars = this.quote().length;
        this.progressUpdate.emit({ charsTyped, totalChars });
      });
  }

  // Called on every keystroke — tracks first-attempt errors, updates signal, checks for finish
  onInput(event: Event): void {
    const inputValue = (event.target as HTMLInputElement).value;
    const quote = this.quote();

    // first-attempt character-level accuracy: only evaluate positions typed for the first time
    const newLen = inputValue.length;
    if (newLen > this.firstAttemptEvalEnd) {
      for (let i = this.firstAttemptEvalEnd; i < newLen && i < quote.length; i++) {
        if (inputValue[i] !== quote[i]) {
          this.firstAttemptErrors.update(n => n + 1);
        }
      }
      this.firstAttemptEvalEnd = newLen;
    }

    this.typedText.set(inputValue);
    this.typingSubject.next(inputValue);

    // finish when the progress count reaches the full quote length.
    // countCorrectChars already accumulates word-by-word so it only hits
    // quote.length at the exact moment the last quote word is fully covered —
    // this keeps the finish condition perfectly in sync with the progress bar
    // and avoids both the premature-finish (space accumulation) bug and the
    // stuck-at-100% bug (last word shorter than expected).
    const charsTyped = this.countCorrectChars(inputValue);
    const totalChars = quote.length;

    if (charsTyped >= totalChars && !this.hasFinished) {
      this.hasFinished = true;

      // force progress to 100% regardless of how many chars matched
      this.progressUpdate.emit({ charsTyped: totalChars, totalChars });

      this.raceFinished.emit({
        timeTaken: Date.now() - this.startTime(),
        rawInput: inputValue,
      });
    }
  }

  // Counts how many characters the user has advanced through in the quote.
  // Tracks PROGRESS (how far through the text), not accuracy.
  // For completed words (moved past with space): the full quote-word length is counted
  // regardless of correctness, plus 1 for the space — the user has covered that ground.
  // For the current in-progress word: count chars typed so far (capped at word length).
  private countCorrectChars(typed: string): number {
    const quoteWords = this.quote().split(' ');
    const typedWords = typed.split(' ');
    let count = 0;

    const typedLen = typedWords.length;
    const quoteLen = quoteWords.length;

    for (let wi = 0; wi < quoteLen; wi++) {
      const qWord    = quoteWords[wi];
      const tWord    = typedWords[wi] || '';
      const wordDone = wi < typedLen - 1; // user pressed space and moved on

      if (wordDone) {
        // covered the whole word + the space after it
        count += qWord.length;
        if (wi < quoteLen - 1) count++; // space (not after last word)
      } else {
        // current word — count chars typed so far, capped at word length
        count += Math.min(tWord.length, qWord.length);
        break;
      }
    }

    return count;
  }
}
