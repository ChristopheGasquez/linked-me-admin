import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { AuthApiService } from '../../shared/services/auth-api.service';
import { RegisterResponse } from '../../shared/models/auth.model';
import { MeResponse } from '../../shared/models/me.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  #authApi = inject(AuthApiService);

  readonly isAuthenticated = signal<boolean>(!!localStorage.getItem(this.ACCESS_TOKEN_KEY));
  readonly currentUser = signal<MeResponse | null>(null);

  register(name: string, email: string, password: string): Observable<RegisterResponse> {
    return this.#authApi.register({ name, email, password });
  }

  login(email: string, password: string): Observable<void> {
    return this.#authApi.login({ email, password }).pipe(
      tap((response) => {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, response.access_token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
        this.isAuthenticated.set(true);
      }),
      switchMap(() => this.#authApi.getMe()),
      tap((me) => this.currentUser.set(me)),
      map(() => undefined),
    );
  }

  resendVerificationEmail(email: string): Observable<void> {
    return this.#authApi.resendVerificationEmail(email);
  }

  logout(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
}
