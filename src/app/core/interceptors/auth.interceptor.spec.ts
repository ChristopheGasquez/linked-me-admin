import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AppConfigService } from '../services/app-config.service';
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

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  // Fails on any request the test did not expect (e.g. an unwanted refresh)
  afterEach(() => backend.verify());

  it('sends API requests with credentials and without Authorization header', () => {
    http.get('/data').subscribe();

    const request = backend.expectOne('/data').request;
    expect(request.withCredentials).toBe(true);
    expect(request.headers.has('Authorization')).toBe(false);
  });

  it('leaves requests outside the API untouched', () => {
    vi.spyOn(TestBed.inject(AppConfigService), 'apiUrl', 'get').mockReturnValue('http://api.test');
    http.get('/i18n/fr.json').subscribe();
    http.get('http://api.test/auth/me').subscribe();

    expect(backend.expectOne('/i18n/fr.json').request.withCredentials).toBe(false);
    expect(backend.expectOne('http://api.test/auth/me').request.withCredentials).toBe(true);
  });

  it('passes other errors through without refreshing', () => {
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, { status: 500, statusText: 'Server Error' });

    expect(result.error?.status).toBe(500);
  });

  it('refreshes the session on a 401 without code and retries the request', () => {
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, unauthorized);
    const refresh = backend.expectOne('/auth/refresh');
    expect(refresh.request.body).toEqual({});
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ code: 'auth.refresh.success' });
    backend.expectOne('/data').flush({ ok: true });

    expect(result.value).toEqual({ ok: true });
  });

  it('refreshes only once for concurrent 401s and retries every request', () => {
    const first = run(http.get('/a'));
    const second = run(http.get('/b'));

    backend.expectOne('/a').flush(null, unauthorized);
    backend.expectOne('/b').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.success' });
    backend.expectOne('/a').flush('A');
    backend.expectOne('/b').flush('B');

    expect([first.value, second.value]).toEqual(['A', 'B']);
  });

  it('fails every request waiting for a refresh that fails', () => {
    const first = run(http.get('/a'));
    const second = run(http.get('/b'));

    backend.expectOne('/a').flush(null, unauthorized);
    backend.expectOne('/b').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

    expect(first.error).toBeDefined();
    expect(second.error).toBeDefined();
  });

  it('clears the session and redirects to login when the refresh is rejected', () => {
    authService.currentUser.set(testUser());
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.token_revoked' }, unauthorized);

    expect(result.error?.status).toBe(401);
    expect(authService.currentUser()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not redirect during a signed-out session check (the guard decides)', () => {
    const result = run(http.get('/auth/me'));

    backend.expectOne('/auth/me').flush(null, unauthorized);
    backend.expectOne('/auth/refresh').flush({ code: 'auth.refresh.invalid_token' }, unauthorized);

    expect(result.error?.status).toBe(401);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('keeps the session when the refresh is throttled', () => {
    authService.currentUser.set(testUser());
    const result = run(http.get('/data'));

    backend.expectOne('/data').flush(null, unauthorized);
    backend
      .expectOne('/auth/refresh')
      .flush({ code: 'throttle.too_many_requests' }, { status: 429, statusText: 'Too Many' });

    expect(result.error?.status).toBe(429);
    expect(authService.currentUser()).not.toBeNull();
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('does not refresh when the current password is wrong on a password change', () => {
    const result = run(http.patch('/profile/password', {}));

    backend
      .expectOne('/profile/password')
      .flush({ code: 'profile.password.incorrect' }, unauthorized);

    expect(result.error?.error.code).toBe('profile.password.incorrect');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it('passes a business 401 through without refreshing', () => {
    const result = run(http.post('/auth/login', {}));

    backend
      .expectOne('/auth/login')
      .flush({ code: 'auth.login.invalid_credentials' }, unauthorized);

    expect(result.error?.error.code).toBe('auth.login.invalid_credentials');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
});
