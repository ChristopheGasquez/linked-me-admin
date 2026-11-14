import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from '../services/auth.service';
import { hasPermissionGuard } from './has-permission.guard';

function runGuard(permissions: string | string[]) {
  return TestBed.runInInjectionContext(() =>
    hasPermissionGuard(permissions)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

function urlOf(result: unknown): string {
  return TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('hasPermissionGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
  });

  it('redirects to login without access token', () => {
    expect(urlOf(runGuard('realm:admin'))).toBe('/auth/login');
  });

  describe('when signed in', () => {
    beforeEach(() => localStorage.setItem('access_token', 'access-1'));

    it('allows a user holding the permission', () => {
      authService.currentUser.set(testUser(['realm:admin']));

      expect(runGuard('realm:admin')).toBe(true);
    });

    it('allows a user holding any of the permissions', () => {
      authService.currentUser.set(testUser(['realm:audit']));

      expect(runGuard(['realm:admin', 'realm:audit'])).toBe(true);
    });

    it('redirects to 403 when the permission is missing', () => {
      authService.currentUser.set(testUser(['realm:profile']));

      expect(urlOf(runGuard('realm:admin'))).toBe('/403');
    });

    it('waits for the user to be loaded before deciding', () => {
      let result: unknown;
      (runGuard('realm:admin') as Observable<unknown>).subscribe((value) => (result = value));
      TestBed.tick();
      expect(result).toBeUndefined();

      authService.currentUser.set(testUser(['realm:admin']));
      TestBed.tick();

      expect(result).toBe(true);
    });
  });
});
