import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from '../services/auth.service';
import { isAuthenticatedGuard } from './is-authenticated.guard';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

function runGuard() {
  let result: unknown;
  TestBed.runInInjectionContext(() =>
    (
      isAuthenticatedGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<
        boolean | UrlTree
      >
    ).subscribe((value) => (result = value)),
  );
  return () => result;
}

describe('isAuthenticatedGuard', () => {
  let authService: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('allows navigation when the user is already loaded', () => {
    authService.currentUser.set(testUser());

    expect(runGuard()()).toBe(true);
  });

  it('loads the user before allowing navigation', () => {
    const result = runGuard();

    backend.expectOne('/auth/me').flush(testUser(['realm:profile']));

    expect(result()).toBe(true);
    expect(authService.currentUser()?.permissions).toEqual(['realm:profile']);
  });

  it('refreshes the session when the access cookie has expired', () => {
    const result = runGuard();

    backend.expectOne('/auth/me').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.success' });
    backend.expectOne('/auth/me').flush(testUser());

    expect(result()).toBe(true);
  });

  it('redirects to login without session', () => {
    const result = runGuard();

    backend.expectOne('/auth/me').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

    expect(TestBed.inject(Router).serializeUrl(result() as UrlTree)).toBe('/auth/login');
  });

  it('redirects to login when the user cannot be loaded', () => {
    const result = runGuard();

    backend.expectOne('/auth/me').flush(null, { status: 500, statusText: 'Server Error' });

    expect(TestBed.inject(Router).serializeUrl(result() as UrlTree)).toBe('/auth/login');
  });
});
