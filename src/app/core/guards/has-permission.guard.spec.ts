import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from '../services/auth.service';
import { hasPermissionGuard } from './has-permission.guard';
import { isAuthenticatedGuard } from './is-authenticated.guard';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

function subscribe(guard: () => unknown) {
  let result: unknown;
  TestBed.runInInjectionContext(() =>
    (guard() as Observable<boolean | UrlTree>).subscribe((value) => (result = value)),
  );
  return () => result;
}

function runGuard(permissions: string | string[]) {
  return subscribe(() =>
    hasPermissionGuard(permissions)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

function urlOf(result: unknown): string {
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('hasPermissionGuard', () => {
  let authService: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('redirects to login without session', () => {
    const result = runGuard('realm:admin');

    backend.expectOne('/auth/me').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

    expect(urlOf(result())).toBe('/auth/login');
  });

  it('allows a user holding the permission', () => {
    authService.currentUser.set(testUser(['realm:admin']));

    expect(runGuard('realm:admin')()).toBe(true);
  });

  it('allows a user holding any of the permissions', () => {
    authService.currentUser.set(testUser(['realm:audit']));

    expect(runGuard(['realm:admin', 'realm:audit'])()).toBe(true);
  });

  it('redirects to 403 when the permission is missing', () => {
    authService.currentUser.set(testUser(['realm:profile']));

    expect(urlOf(runGuard('realm:admin')())).toBe('/403');
  });

  it('shares the session check with the parent guard running alongside', () => {
    const parent = subscribe(() =>
      isAuthenticatedGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    const child = runGuard('realm:admin');

    backend.expectOne('/auth/me').flush(testUser(['realm:admin']));

    expect(parent()).toBe(true);
    expect(child()).toBe(true);
  });
});
