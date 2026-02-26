import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { ApiError } from '../../../../shared/models/api-response.model';
import { applyValidationErrors } from '../../../../shared/utils/form-validation';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatCardHeader,
    MatCardActions,
    MatCardSubtitle,
    MatButton,
    MatIconButton,
    MatIcon,
    MatSuffix,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    RouterLink,
    TranslocoDirective,
  ],
})
export class ResetPassword implements OnInit, OnDestroy {
  #formBuilder = inject(FormBuilder);
  #authService = inject(AuthService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);

  loading = signal(false);
  hasToken = signal(false);
  success = signal(false);
  showPassword = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  countdown = signal(10);

  #token: string | null = null;
  #interval: ReturnType<typeof setInterval> | null = null;

  form: FormGroup = this.#formBuilder.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.#token = this.#route.snapshot.queryParamMap.get('token');
    if (!this.#token) {
      this.error.set({ code: 'auth.password_reset.invalid_token' });
    } else {
      this.hasToken.set(true);
    }
  }

  ngOnDestroy(): void {
    this.#clearInterval();
  }

  onSubmit(): void {
    if (this.form.invalid || !this.#token) return;

    const { password } = this.form.getRawValue();
    this.error.set(null);
    this.loading.set(true);
    this.#authService
      .resetPassword(this.#token, password)
      .pipe(
        tap(() => {
          this.success.set(true);
          this.#startCountdown();
        }),
        catchError((err: HttpErrorResponse) => {
          const apiError = err.error as ApiError;
          if (apiError?.code === 'validation.failed') {
            applyValidationErrors(this.form, apiError);
          } else {
            this.error.set({
              code: apiError?.code ?? 'unknown',
              params: apiError?.params as Record<string, unknown>,
            });
          }
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }

  #startCountdown(): void {
    this.#interval = setInterval(() => {
      const n = this.countdown();
      if (n <= 1) {
        this.#clearInterval();
        this.#router.navigate(['/', 'auth', 'login']);
      } else {
        this.countdown.set(n - 1);
      }
    }, 1000);
  }

  #clearInterval(): void {
    if (this.#interval !== null) {
      clearInterval(this.#interval);
      this.#interval = null;
    }
  }
}
