import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from '../services/auth.service';
import { isAuthenticatedGuard } from './is-authenticated.guard';

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    isAuthenticatedGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('isAuthenticatedGuard', () => {
  let authService: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('redirects to login without access token', () => {
    expect(TestBed.inject(Router).serializeUrl(runGuard() as UrlTree)).toBe('/auth/login');
  });

  describe('with an access token', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'access-1');
      localStorage.setItem('refresh_token', 'refresh-1');
    });

    it('allows navigation when the user is already loaded', () => {
      authService.currentUser.set(testUser());

      expect(runGuard()).toBe(true);
    });

    it('loads the user before allowing navigation', () => {
      let result: unknown;
      (runGuard() as Observable<unknown>).subscribe((value) => (result = value));

      backend.expectOne('/auth/me').flush(testUser(['realm:profile']));

      expect(result).toBe(true);
      expect(authService.currentUser()?.permissions).toEqual(['realm:profile']);
    });

    it('logs out and redirects to login when the user cannot be loaded', () => {
      let result: unknown;
      (runGuard() as Observable<unknown>).subscribe((value) => (result = value));

      backend.expectOne('/auth/me').flush(null, { status: 500, statusText: 'Server Error' });
      backend.expectOne('/auth/logout').flush(null);

      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/auth/login');
      expect(authService.getAccessToken()).toBeNull();
    });
  });
});
