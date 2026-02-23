import { ApplicationConfig, inject, isDevMode, provideBrowserGlobalErrorListeners, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { MatIconRegistry } from '@angular/material/icon';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { TranslocoHttpLoader } from './core/services/transloco-loader.service';
import { AVAILABLE_LANGS } from './shared/models/lang.model';

import { routes } from './app.routes';
import { AppConfigService } from './core/services/app-config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: [...AVAILABLE_LANGS],
        defaultLang: localStorage.getItem('lang') ?? AVAILABLE_LANGS[0],
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    provideAppInitializer(() => {
      inject(TranslocoService).langChanges$
        .subscribe((lang: string) => localStorage.setItem('lang', lang));
    }),
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
