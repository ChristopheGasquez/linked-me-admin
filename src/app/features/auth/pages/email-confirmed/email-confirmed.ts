import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';

import { AuthApiService } from '../../../../shared/services/auth-api.service';
import { ApiError } from '../../../../shared/models/api-response.model';

@Component({
  selector: 'app-email-confirmed',
  templateUrl: './email-confirmed.html',
  styleUrl: './email-confirmed.scss',
  imports: [
    TranslocoDirective,
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatCardHeader,
    MatCardActions,
    MatButton,
    RouterLink,
  ],
})
export class EmailConfirmed implements OnInit, OnDestroy {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #authApi = inject(AuthApiService);

  loading = signal(true);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  countdown = signal(10);

  #interval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    const token = this.#route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading.set(false);
      this.error.set({ code: 'auth.email.invalid_token' });
      return;
    }
    this.#authApi
      .verifyEmail(token)
      .pipe(
        tap(() => this.#startCountdown()),
        catchError((err: HttpErrorResponse) => {
          const apiError = err.error as ApiError;
          this.error.set({
            code: apiError?.code ?? 'unknown',
            params: apiError?.params as Record<string, unknown>,
          });
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.#clearInterval();
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
