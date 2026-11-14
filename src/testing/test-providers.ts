import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, importProvidersFrom, Provider } from '@angular/core';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import en from '../../public/i18n/en.json';
import fr from '../../public/i18n/fr.json';
import { authInterceptor } from '../app/core/interceptors/auth.interceptor';
import { MeResponse } from '../app/shared/models/me.model';

// Real translations, for assertions robust to wording changes (e.g. fr.common.cancel)
export { fr };

// App-like HTTP stack (real auth interceptor, mocked backend), empty router,
// real translations (French active, loaded synchronously), Material animations off
export function provideTestDefaults(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideHttpClientTesting(),
    provideRouter([]),
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: { fr, en },
        translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
        preloadLangs: true,
      }),
    ),
    { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
  ];
}

export function testUser(permissions: string[] = []): MeResponse {
  return {
    id: 1,
    email: 'admin@test.dev',
    name: 'Admin',
    isEmailChecked: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    roles: [],
    permissions,
  };
}
