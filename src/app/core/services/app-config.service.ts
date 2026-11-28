import { Injectable } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  turnstileSiteKey: string;
  // Comma-separated origins that /auth/login?returnUrl= may send the user back to
  returnUrlOrigins?: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig = { apiUrl: '', turnstileSiteKey: '' };

  load(): Promise<void> {
    return fetch('/config.json')
      .then((res) => res.json())
      .then((config: AppConfig) => {
        this.config = config;
      });
  }

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  get turnstileSiteKey(): string {
    return this.config.turnstileSiteKey;
  }

  get returnUrlOrigins(): string[] {
    return (this.config.returnUrlOrigins ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
}
