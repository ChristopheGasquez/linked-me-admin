import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { provideTestDefaults } from '../../../testing/test-providers';
import { guestGuard } from './guest.guard';

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );
}

describe('guestGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
  });

  it('lets a signed-out visitor through', () => {
    expect(runGuard()).toBe(true);
  });

  it('sends a signed-in user to the dashboard', () => {
    localStorage.setItem('access_token', 'access-1');

    expect(TestBed.inject(Router).serializeUrl(runGuard() as UrlTree)).toBe('/dashboard');
  });
});
