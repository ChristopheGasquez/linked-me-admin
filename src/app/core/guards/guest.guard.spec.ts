import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from '../services/auth.service';
import { guestGuard } from './guest.guard';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

function runGuard() {
  let result: unknown;
  TestBed.runInInjectionContext(() =>
    (
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<
        boolean | UrlTree
      >
    ).subscribe((value) => (result = value)),
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
});
