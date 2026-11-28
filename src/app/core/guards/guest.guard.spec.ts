import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';
import { ReturnUrlService } from '../services/return-url.service';
import { guestGuard } from './guest.guard';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

function runGuard(queryParams: Record<string, string> = {}) {
  const route = { queryParamMap: convertToParamMap(queryParams) } as ActivatedRouteSnapshot;
  let result: unknown;
  TestBed.runInInjectionContext(() =>
    (guestGuard(route, {} as RouterStateSnapshot) as Observable<boolean | UrlTree>).subscribe(
      (value) => (result = value),
    ),
  );
  return () => result;
}

describe('guestGuard', () => {
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lets a signed-out visitor through', () => {
    const result = runGuard();

    backend.expectOne('/auth/me').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

    expect(result()).toBe(true);
  });

  it('sends a signed-in user to the dashboard', () => {
    TestBed.inject(AuthService).currentUser.set(testUser());

    expect(TestBed.inject(Router).serializeUrl(runGuard()() as UrlTree)).toBe('/dashboard');
  });

  it('sends a user with a session cookie to the dashboard', () => {
    const result = runGuard();

    backend.expectOne('/auth/me').flush(testUser());

    expect(TestBed.inject(Router).serializeUrl(result() as UrlTree)).toBe('/dashboard');
  });

  describe('sent by another app', () => {
    let go: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.spyOn(TestBed.inject(AppConfigService), 'returnUrlOrigins', 'get').mockReturnValue([
        'https://app.gasquez.fr',
      ]);
      go = vi.spyOn(TestBed.inject(ReturnUrlService), 'go').mockImplementation(() => undefined);
    });

    it('sends a signed-in user straight back to an allowed app', () => {
      TestBed.inject(AuthService).currentUser.set(testUser());

      expect(runGuard({ returnUrl: 'https://app.gasquez.fr/projects' })()).toBe(false);
      expect(go).toHaveBeenCalledWith('https://app.gasquez.fr/projects');
    });

    it('sends a signed-in user to the dashboard when the app is not allowed', () => {
      TestBed.inject(AuthService).currentUser.set(testUser());

      const result = runGuard({ returnUrl: 'https://evil.com/' })();

      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
      expect(go).not.toHaveBeenCalled();
    });

    it('shows the login form to a signed-out visitor', () => {
      const result = runGuard({ returnUrl: 'https://app.gasquez.fr/projects' });

      backend.expectOne('/auth/me').flush(null, unauthorized);
      backend
        .expectOne('/auth/refresh')
        .flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

      expect(result()).toBe(true);
      expect(go).not.toHaveBeenCalled();
    });
  });
});
