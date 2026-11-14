import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, share, switchMap, tap } from 'rxjs/operators';

import { AuthApiService } from '../../shared/services/auth-api.service';
import { RegisterResponse } from '../../shared/models/auth.model';
import { ApiMessage } from '../../shared/models/api-response.model';
import { MeResponse } from '../../shared/models/me.model';
import { UrlService } from './url.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  #authApi = inject(AuthApiService);
  #urlService = inject(UrlService);

  // Refresh in progress, shared by every request waiting for it (success or failure)
  #refresh$: Observable<string> | null = null;

  readonly isAuthenticated = signal<boolean>(!!localStorage.getItem(this.ACCESS_TOKEN_KEY));
  readonly currentUser = signal<MeResponse | null>(null);

  register(name: string, email: string, password: string): Observable<RegisterResponse> {
    const callbackUrl = `${window.location.origin}/auth/email-confirmed`;
    return this.#authApi.register({ name, email, password, callbackUrl });
  }

  login(email: string, password: string): Observable<void> {
    return this.#authApi.login({ email, password }).pipe(
      tap((response) => {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
        this.isAuthenticated.set(true);
      }),
      switchMap(() => this.loadMe()),
    );
  }

  loadMe(): Observable<void> {
    return this.#authApi.getMe().pipe(
      tap((me) => this.currentUser.set(me)),
      map(() => undefined),
    );
  }

  resendVerificationEmail(email: string): Observable<ApiMessage> {
    const callbackUrl = `${window.location.origin}/auth/email-confirmed`;
    return this.#authApi.resendVerificationEmail(email, callbackUrl);
  }

  forgotPassword(email: string): Observable<ApiMessage> {
    const callbackUrl = `${window.location.origin}/auth/reset-password`;
    return this.#authApi.forgotPassword(email, callbackUrl);
  }

  resetPassword(token: string, password: string): Observable<ApiMessage> {
    return this.#authApi.resetPassword(token, password);
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.#authApi
        .logout(refreshToken)
        .pipe(catchError(() => EMPTY))
        .subscribe();
    }
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.#urlService.clearListUrl();
  }

  refreshTokens(): Observable<string> {
    if (this.#refresh$) {
      return this.#refresh$;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    this.#refresh$ = this.#authApi.refresh(refreshToken).pipe(
      tap((tokens) => {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh_token);
      }),
      map((tokens) => tokens.access_token),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      }),
      finalize(() => (this.#refresh$ = null)),
      share(),
    );
    return this.#refresh$;
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
}
