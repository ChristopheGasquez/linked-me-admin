import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { ApiMessage } from '../../../../shared/models/api-response.model';
import { AuthService } from '../../../../core/services/auth.service';
import { Turnstile } from '../../../../shared/components/turnstile/turnstile';
import { toApiError } from '../../../../shared/utils/api-error';
import {
  InfoCard,
  InfoCardAction,
  InfoCardNotification,
} from '../../../../shared/components/info-card/info-card';

@Component({
  selector: 'app-verify-email',
  imports: [InfoCard, Turnstile],
  styles: [
    ':host { display: contents; }',
    '.verify-email__turnstile { margin-top: var(--lma-spacing-gap--lg); }',
  ],
  template: `
    <app-info-card
      titleKey="auth.verifyEmail.title"
      descriptionKey="auth.verifyEmail.description"
      [notifications]="notifications()"
      [actions]="actions()">
      @if (canResend()) {
        <app-turnstile class="verify-email__turnstile" />
      }
    </app-info-card>
  `,
})
export class VerifyEmail {
  #authService = inject(AuthService);
  #email = inject(ActivatedRoute).snapshot.queryParamMap.get('email');

  readonly captcha = viewChild(Turnstile);

  loading = signal(false);
  notifications = signal<InfoCardNotification[]>([]);

  readonly canResend = computed(
    () =>
      !!this.#email &&
      !this.notifications().some((notification) => notification.type === 'success'),
  );

  actions = computed<InfoCardAction[]>(() => [
    ...(this.canResend()
      ? [
          {
            type: 'button' as const,
            labelKey: 'auth.verifyEmail.resend',
            cssClass: 'button--error',
            disabled: this.loading() || !this.captcha()?.token(),
            onClick: () => this.#resend(),
          },
        ]
      : []),
    {
      type: 'link' as const,
      labelKey: 'auth.verifyEmail.backToLogin',
      routerLink: ['/', 'auth', 'login'],
    },
  ]);

  #resend(): void {
    const captchaToken = this.captcha()?.token();
    if (!captchaToken) return;
    this.loading.set(true);
    this.#authService
      .resendVerificationEmail(this.#email!, captchaToken)
      .pipe(
        tap((response: ApiMessage) =>
          this.notifications.set([{ type: 'success', key: 'api.' + response.code }]),
        ),
        catchError((err: HttpErrorResponse) => {
          const { code, params } = toApiError(err);
          this.notifications.set([{ type: 'error', key: 'api.' + code, params }]);
          return EMPTY;
        }),
        finalize(() => {
          this.loading.set(false);
          this.captcha()?.reset();
        }),
      )
      .subscribe();
  }
}
