import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { AuthService } from './auth.service';

describe('AuthService.logout', () => {
  let authService: AuthService;
  let backend: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('revokes the refresh token on the server and clears the session', () => {
    localStorage.setItem('access_token', 'access-1');
    localStorage.setItem('refresh_token', 'refresh-1');
    authService.currentUser.set(testUser());

    authService.logout();

    expect(backend.expectOne('/auth/logout').request.body).toEqual({ refresh_token: 'refresh-1' });
    expect(authService.getAccessToken()).toBeNull();
    expect(authService.getRefreshToken()).toBeNull();
    expect(authService.currentUser()).toBeNull();
  });

  it('does not call the API without refresh token', () => {
    localStorage.setItem('access_token', 'access-1');

    authService.logout();

    backend.expectNone('/auth/logout');
    expect(authService.getAccessToken()).toBeNull();
  });
});
