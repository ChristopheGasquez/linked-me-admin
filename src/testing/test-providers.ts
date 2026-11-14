import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';

import { authInterceptor } from '../app/core/interceptors/auth.interceptor';
import { MeResponse } from '../app/shared/models/me.model';

// App-like HTTP stack (real auth interceptor, mocked backend) and an empty router
export function provideTestDefaults(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideHttpClientTesting(),
    provideRouter([]),
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
