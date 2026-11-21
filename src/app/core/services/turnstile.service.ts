import { Injectable } from '@angular/core';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileOptions {
  sitekey: string;
  theme: 'light' | 'dark';
  language: string;
  size: 'flexible';
  appearance: 'always';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

export interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// Loads the Cloudflare script once, on first use (auth pages only)
@Injectable({ providedIn: 'root' })
export class TurnstileService {
  #api?: Promise<TurnstileApi>;

  load(): Promise<TurnstileApi> {
    this.#api ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(window.turnstile!);
      script.onerror = () => {
        script.remove();
        this.#api = undefined;
        reject(new Error('Turnstile script failed to load'));
      };
      document.head.appendChild(script);
    });
    return this.#api;
  }
}
