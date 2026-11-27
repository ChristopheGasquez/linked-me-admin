import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from './auth.service';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

function run<T>(request: Observable<T>) {
  const result: { value?: T; error?: unknown; done: boolean } = { done: false };
  request.subscribe({
    next: (value) => (result.value = value),
    error: (error) => (result.error = error),
    complete: () => (result.done = true),
  });
  return result;
}

describe('AuthService', () => {
  let authService: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('logout', () => {
    it('clears the session only once the API has cleared the cookies', () => {
      authService.currentUser.set(testUser());
      const result = run(authService.logout());

      const logout = backend.expectOne('/auth/logout');
      expect(logout.request.body).toEqual({});
      expect(authService.isAuthenticated()).toBe(true);
      logout.flush({ code: 'auth.logout.success' });

      expect(result.done).toBe(true);
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('clears the session even when the API call fails', () => {
      authService.currentUser.set(testUser());
      const result = run(authService.logout());

      backend.expectOne('/auth/logout').flush(null, { status: 500, statusText: 'Server Error' });

      expect(result.error).toBeUndefined();
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('checkSession', () => {
    it('answers true without request when the user is loaded', () => {
      authService.currentUser.set(testUser());

      expect(run(authService.checkSession()).value).toBe(true);
    });

    it('loads the user once for concurrent checks', () => {
      const first = run(authService.checkSession());
      const second = run(authService.checkSession());

      backend.expectOne('/auth/me').flush(testUser(['realm:profile']));

      expect([first.value, second.value]).toEqual([true, true]);
      expect(authService.currentUser()?.permissions).toEqual(['realm:profile']);
    });

    it('remembers a signed-out visitor: no second /auth/me', () => {
      const first = run(authService.checkSession());
      backend.expectOne('/auth/me').flush(null, unauthorized);
      backend
        .expectOne('/auth/refresh')
        .flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

      expect(first.value).toBe(false);
      expect(run(authService.checkSession()).value).toBe(false);
    });

    it('answers false without request after clearSession', () => {
      authService.currentUser.set(testUser());
      authService.clearSession();

      expect(run(authService.checkSession()).value).toBe(false);
    });
  });

  describe('refreshSession', () => {
    it('flags a replayed refresh token so the login page can explain it', () => {
      authService.currentUser.set(testUser());
      run(authService.refreshSession());

      backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.token_reused' }, unauthorized);

      expect(authService.sessionInterrupted()).toBe(true);
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('does not flag the other rejected refreshes', () => {
      authService.currentUser.set(testUser());
      run(authService.refreshSession());

      backend
        .expectOne('/auth/refresh')
        .flush({ code: 'auth.refresh.token_revoked' }, unauthorized);

      expect(authService.sessionInterrupted()).toBe(false);
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('keeps the session when the refresh is throttled', () => {
      authService.currentUser.set(testUser());
      const result = run(authService.refreshSession());

      backend
        .expectOne('/auth/refresh')
        .flush({ code: 'throttle.too_many_requests' }, { status: 429, statusText: 'Too Many' });

      expect(result.error).toBeDefined();
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  it('clears the session after a password reset (the API clears the cookies)', () => {
    authService.currentUser.set(testUser());
    run(authService.resetPassword('reset-token', 'Passw0rd!'));

    backend.expectOne('/auth/reset-password').flush({ code: 'auth.password_reset.success' });

    expect(authService.isAuthenticated()).toBe(false);
  });

  it('resets the interrupted flag after a successful login', () => {
    authService.sessionInterrupted.set(true);
    run(authService.login('admin@test.dev', 'Passw0rd!', 'captcha'));

    backend.expectOne('/auth/login').flush({ user: {} });
    backend.expectOne('/auth/me').flush(testUser());

    expect(authService.sessionInterrupted()).toBe(false);
    expect(authService.isAuthenticated()).toBe(true);
  });
});
