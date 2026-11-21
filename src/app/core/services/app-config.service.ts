import { Injectable } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  turnstileSiteKey: string;
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
}
