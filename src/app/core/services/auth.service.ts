import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, finalize, map, share, switchMap, tap } from 'rxjs/operators';

import { AuthApiService } from '../../shared/services/auth-api.service';
import { RegisterResponse } from '../../shared/models/auth.model';
import { ApiMessage } from '../../shared/models/api-response.model';
import { MeResponse } from '../../shared/models/me.model';
import { UrlService } from './url.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  #authApi = inject(AuthApiService);
  #urlService = inject(UrlService);

  // Refresh in progress, shared by every request waiting for it (success or failure)
  #refresh$: Observable<void> | null = null;
  // Session check in progress, shared by the guards of the same navigation
  #check$: Observable<boolean> | null = null;
  // Session cookies are HttpOnly: once /auth/me has answered, the outcome is known until login/logout
  #checked = false;

  readonly currentUser = signal<MeResponse | null>(null);
  // Refresh token replayed (auth.refresh.token_reused): the login page shows a dedicated message
  readonly sessionInterrupted = signal(false);

  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  register(
    name: string,
    email: string,
    password: string,
    captchaToken: string,
  ): Observable<RegisterResponse> {
    const callbackUrl = `${window.location.origin}/auth/email-confirmed`;
    return this.#authApi.register({ name, email, password, callbackUrl }, captchaToken);
  }

  login(email: string, password: string, captchaToken: string): Observable<void> {
    return this.#authApi.login({ email, password }, captchaToken).pipe(
      switchMap(() => this.loadMe()),
      tap(() => this.sessionInterrupted.set(false)),
    );
  }

  loadMe(): Observable<void> {
    return this.#authApi.getMe().pipe(
      tap((me) => {
        this.currentUser.set(me);
        this.#checked = true;
      }),
      map(() => undefined),
    );
  }

  // A 401 on /auth/me goes through the interceptor's refresh before failing here
  checkSession(): Observable<boolean> {
    if (this.currentUser()) {
      return of(true);
    }
    if (this.#checked) {
      return of(false);
    }
    if (this.#check$) {
      return this.#check$;
    }

    this.#check$ = this.loadMe().pipe(
      map(() => true),
      catchError(() => {
        this.#checked = true;
        return of(false);
      }),
      finalize(() => (this.#check$ = null)),
      share(),
    );
    return this.#check$;
  }

  resendVerificationEmail(email: string, captchaToken: string): Observable<ApiMessage> {
    const callbackUrl = `${window.location.origin}/auth/email-confirmed`;
    return this.#authApi.resendVerificationEmail(email, callbackUrl, captchaToken);
  }

  forgotPassword(email: string, captchaToken: string): Observable<ApiMessage> {
    const callbackUrl = `${window.location.origin}/auth/reset-password`;
    return this.#authApi.forgotPassword(email, callbackUrl, captchaToken);
  }

  // The API revokes every session and clears the cookies, even when the reset is done while signed in
  resetPassword(token: string, password: string): Observable<ApiMessage> {
    return this.#authApi.resetPassword(token, password).pipe(tap(() => this.clearSession()));
  }

  // Waits for the API to clear the cookies: navigating before would let guestGuard find the session again
  logout(): Observable<void> {
    return this.#authApi.logout().pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession()),
      map(() => undefined),
    );
  }

  // When the API has already cleared the cookies (password change, account deletion, logout-all...)
  clearSession(): void {
    this.currentUser.set(null);
    this.#checked = true;
    this.#urlService.clearListUrl();
  }

  refreshSession(): Observable<void> {
    if (this.#refresh$) {
      return this.#refresh$;
    }

    this.#refresh$ = this.#authApi.refresh().pipe(
      map(() => undefined),
      catchError((error: unknown) => {
        // Throttle, network or server errors keep the session: only a rejected refresh token ends it
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.sessionInterrupted.set(error.error?.code === 'auth.refresh.token_reused');
          this.clearSession();
        }
        return throwError(() => error);
      }),
      finalize(() => (this.#refresh$ = null)),
      share(),
    );
    return this.#refresh$;
  }
}
