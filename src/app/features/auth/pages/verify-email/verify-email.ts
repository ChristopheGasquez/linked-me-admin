import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { ApiError, ApiMessage } from '../../../../shared/models/api-response.model';
import { AuthService } from '../../../../core/services/auth.service';
import {
  InfoCard,
  InfoCardAction,
  InfoCardNotification,
} from '../../../../shared/components/info-card/info-card';

@Component({
  selector: 'app-verify-email',
  imports: [InfoCard],
  styles: [':host { display: contents; }'],
  template: `
    <app-info-card
      titleKey="auth.verifyEmail.title"
      descriptionKey="auth.verifyEmail.description"
      [notifications]="notifications()"
      [actions]="actions()" />
  `,
})
export class VerifyEmail {
  #authService = inject(AuthService);
  #email = inject(ActivatedRoute).snapshot.queryParamMap.get('email');

  loading = signal(false);
  notifications = signal<InfoCardNotification[]>([]);

  actions = computed<InfoCardAction[]>(() => [
    ...(!this.#email || this.notifications().length
      ? []
      : [
          {
            type: 'button' as const,
            labelKey: 'auth.verifyEmail.resend',
            cssClass: 'button--error',
            disabled: this.loading(),
            onClick: () => this.#resend(),
          },
        ]),
    {
      type: 'link' as const,
      labelKey: 'auth.verifyEmail.backToLogin',
      routerLink: ['/', 'auth', 'login'],
    },
  ]);

  #formatRetryAfter(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.ceil(seconds / 60)} min`;
  }

  #resend(): void {
    this.loading.set(true);
    this.#authService
      .resendVerificationEmail(this.#email!)
      .pipe(
        tap((response: ApiMessage) => this.notifications.set([{ type: 'success', key: 'api.' + response.code }])),
        catchError((err: HttpErrorResponse) => {
          const apiError = err.error as ApiError;
          const rawParams = apiError?.params as Record<string, unknown> | undefined;
          const params = rawParams?.['retryAfter'] !== undefined
            ? { ...rawParams, retryAfter: this.#formatRetryAfter(rawParams['retryAfter'] as number) }
            : rawParams;
          this.notifications.set([{ type: 'error', key: 'api.' + (apiError?.code ?? 'unknown'), params }]);
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }
}
