import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AppConfigService } from './core/services/app-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      const cfg = inject(AppConfigService);
      return cfg.load();
    }),
    provideAppInitializer(() => {
      const registry = inject(MatIconRegistry);
      registry.setDefaultFontSetClass('material-symbols-outlined');
    }),
  ],
};
