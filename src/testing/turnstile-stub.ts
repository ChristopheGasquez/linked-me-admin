import { TestBed } from '@angular/core/testing';

import {
  TurnstileApi,
  TurnstileOptions,
  TurnstileService,
} from '../app/core/services/turnstile.service';

// In-memory Cloudflare widget: tests trigger its callbacks instead of solving a real challenge
export class FakeTurnstileApi implements TurnstileApi {
  readonly widgets = new Map<string, TurnstileOptions>();
  #count = 0;

  render = vi.fn((_container: HTMLElement, options: TurnstileOptions) => {
    const widgetId = `widget-${++this.#count}`;
    this.widgets.set(widgetId, options);
    return widgetId;
  });
  reset = vi.fn();
  remove = vi.fn((widgetId: string) => {
    this.widgets.delete(widgetId);
  });

  solve(token = 'captcha-token'): void {
    this.#current().callback(token);
  }

  expire(): void {
    this.#current()['expired-callback']();
  }

  fail(): void {
    this.#current()['error-callback']();
  }

  // Options of the only widget on screen
  #current(): TurnstileOptions {
    const [options] = [...this.widgets.values()];
    return options;
  }
}

export class FakeTurnstileService {
  readonly api = new FakeTurnstileApi();
  load = vi.fn(() => Promise.resolve<TurnstileApi>(this.api));
}

export function fakeTurnstile(): FakeTurnstileApi {
  return (TestBed.inject(TurnstileService) as unknown as FakeTurnstileService).api;
}
