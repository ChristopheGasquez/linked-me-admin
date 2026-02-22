import { Injectable } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig = { apiUrl: '' };

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
}
