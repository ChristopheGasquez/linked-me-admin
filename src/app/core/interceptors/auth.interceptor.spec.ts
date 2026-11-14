import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from '../services/auth.service';

const unauthorized = { status: 401, statusText: 'Unauthorized' };

function run<T>(request: Observable<T>) {
  const result: { value?: T; error?: HttpErrorResponse } = {};
  request.subscribe({
    next: (value) => (result.value = value),
    error: (error) => (result.error = error),
  });
  return result;
}

function setTokens(access: string | null, refresh: string | null) {
  if (access) localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  // Fails on any request the test did not expect (e.g. an unwanted refresh)
  afterEach(() => backend.verify());

  it('adds the access token to requests', () => {
    setTokens('access-1', null);
    http.get('/data').subscribe();

    expect(backend.expectOne('/data').request.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('sends requests without Authorization header when there is no token', () => {
    http.get('/data').subscribe();

    expect(backend.expectOne('/data').request.headers.has('Authorization')).toBe(false);
  });

  it('passes other errors through without refreshing', () => {
    setTokens('access-1', 'refresh-1');
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, { status: 500, statusText: 'Server Error' });

    expect(result.error?.status).toBe(500);
  });

  it('refreshes the tokens on 401 and retries the request with the new token', () => {
    setTokens('expired', 'refresh-1');
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, unauthorized);
    const refresh = backend.expectOne('/auth/refresh');
    expect(refresh.request.body).toEqual({ refresh_token: 'refresh-1' });
    refresh.flush({ access_token: 'access-2', refresh_token: 'refresh-2' });
    const retry = backend.expectOne('/data');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush({ ok: true });

    expect(result.value).toEqual({ ok: true });
    expect(localStorage.getItem('access_token')).toBe('access-2');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-2');
  });

  it('refreshes only once for concurrent 401s and retries every request', () => {
    setTokens('expired', 'refresh-1');
    const first = run(http.get('/a'));
    const second = run(http.get('/b'));

    backend.expectOne('/a').flush(null, unauthorized);
    backend.expectOne('/b').flush(null, unauthorized);
    backend
      .expectOne('/auth/refresh')
      .flush({ access_token: 'access-2', refresh_token: 'refresh-2' });
    backend.expectOne('/a').flush('A');
    backend.expectOne('/b').flush('B');

    expect([first.value, second.value]).toEqual(['A', 'B']);
  });

  it('logs out and redirects to login when the refresh fails', () => {
    setTokens('expired', 'refresh-1');
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set(testUser());
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush(null, unauthorized);
    // Logout is currently triggered twice on this path (interceptor + refreshTokens)
    backend.match('/auth/logout').forEach((request) => request.flush(null));

    expect(result.error?.status).toBe(401);
    expect(authService.getAccessToken()).toBeNull();
    expect(authService.getRefreshToken()).toBeNull();
    expect(authService.currentUser()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('logs out and redirects to login when there is no refresh token', () => {
    setTokens('expired', null);
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, unauthorized);

    expect(result.error).toBeDefined();
    expect(TestBed.inject(AuthService).getAccessToken()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not refresh when the current password is wrong on a password change', () => {
    setTokens('access-1', 'refresh-1');
    const result = run(http.patch('/profile/password', {}));

    backend
      .expectOne('/profile/password')
      .flush({ code: 'profile.password.incorrect' }, unauthorized);

    expect(result.error?.error.code).toBe('profile.password.incorrect');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it.each([
    ['with a stale token', 'access-1'],
    ['without token', null],
  ])('passes a business 401 through without refreshing (%s)', (_, access) => {
    setTokens(access, 'refresh-1');
    const result = run(http.post('/auth/login', {}));

    backend
      .expectOne('/auth/login')
      .flush({ code: 'auth.login.invalid_credentials' }, unauthorized);

    expect(result.error?.error.code).toBe('auth.login.invalid_credentials');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
});
