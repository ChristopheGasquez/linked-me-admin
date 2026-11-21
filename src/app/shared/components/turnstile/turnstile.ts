import { afterRenderEffect, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

import { AppConfigService } from '../../../core/services/app-config.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TurnstileApi, TurnstileService } from '../../../core/services/turnstile.service';

// Cloudflare captcha: exposes the current token, null until solved, after expiry or reset
@Component({
  selector: 'app-turnstile',
  templateUrl: './turnstile.html',
  styleUrl: './turnstile.scss',
  imports: [TranslocoDirective],
})
export class Turnstile {
  #turnstileService = inject(TurnstileService);
  #config = inject(AppConfigService);
  #theme = inject(ThemeService);
  #transloco = inject(TranslocoService);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  readonly token = signal<string | null>(null);
  readonly loadFailed = signal(false);
  readonly #api = signal<TurnstileApi | null>(null);
  readonly #lang = toSignal(this.#transloco.langChanges$, {
    initialValue: this.#transloco.getActiveLang(),
  });
  #widgetId: string | null = null;

  constructor() {
    this.#turnstileService.load().then(
      (api) => this.#api.set(api),
      () => this.loadFailed.set(true),
    );

    // Rendered again on theme or language change; removed on destroy
    afterRenderEffect((onCleanup) => {
      const api = this.#api();
      if (!api) return;
      const widgetId = api.render(this.container().nativeElement, {
        sitekey: this.#config.turnstileSiteKey,
        theme: this.#theme.isDark() ? 'dark' : 'light',
        language: this.#lang(),
        size: 'flexible',
        appearance: 'always',
        callback: (token) => this.token.set(token),
        'expired-callback': () => this.token.set(null),
        'error-callback': () => this.token.set(null),
      });
      this.#widgetId = widgetId;
      onCleanup(() => {
        api.remove(widgetId);
        this.#widgetId = null;
        this.token.set(null);
      });
    });
  }

  // Tokens are single-use: call after every API response while staying on the page
  reset(): void {
    this.token.set(null);
    if (this.#widgetId) {
      this.#api()?.reset(this.#widgetId);
    }
  }
}
