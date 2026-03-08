import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import {
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';

// ── Custom field validators ────────────────────────────────────────────────
function hasUppercase(c: AbstractControl): ValidationErrors | null {
  return /[A-Z]/.test(c.value ?? '') ? null : { noUppercase: true };
}

function hasDigit(c: AbstractControl): ValidationErrors | null {
  return /[0-9]/.test(c.value ?? '') ? null : { noDigit: true };
}

function hasSpecialChar(c: AbstractControl): ValidationErrors | null {
  return /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/.test(c.value ?? '')
    ? null
    : { noSpecial: true };
}

function noWhitespace(c: AbstractControl): ValidationErrors | null {
  return /\s/.test(c.value ?? '') ? { hasWhitespace: true } : null;
}

// ── Cross-field validator ─────────────────────────────────────────────────
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router      = inject(Router);

  readonly registerForm = this.fb.group(
    {
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(20),
          Validators.pattern(/^[a-zA-Z0-9_]+$/),
          noWhitespace,
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(64),
          hasUppercase,
          hasDigit,
          hasSpecialChar,
        ],
      ],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  errorMessage = '';

  /** Returns 'weak' | 'medium' | 'strong' based on how many criteria pass. */
  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const pw = this.registerForm.get('password')?.value ?? '';
    const score = [
      pw.length >= 8,
      /[A-Z]/.test(pw),
      /[0-9]/.test(pw),
      /[!@#$%^&*()_=+[\]{};:'",.<>?/\\|`~]/.test(pw),
      pw.length >= 12,
    ].filter(Boolean).length;
    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    const { email, username, password } = this.registerForm.value;
    this.authService.register(email!, username!, password!).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.errorMessage = 'Registration failed. Please try again.';
      },
    });
  }
}