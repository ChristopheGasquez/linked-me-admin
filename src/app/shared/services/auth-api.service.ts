import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { AuthResponse, RegisterResponse, TokensResponse } from '../models/auth.model';
import { LoginDto, RegisterDto } from '../models/login.dto';
import { MeResponse } from '../models/me.model';
import { ApiMessage } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/auth`;
  }

  register(dto: RegisterDto): Observable<RegisterResponse> {
    return this.#http.post<RegisterResponse>(`${this.baseUrl}/register`, dto);
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.#http.post<AuthResponse>(`${this.baseUrl}/login`, dto);
  }

  getMe(): Observable<MeResponse> {
    return this.#http.get<MeResponse>(`${this.baseUrl}/me`);
  }

  refresh(refreshToken: string): Observable<TokensResponse> {
    return this.#http.post<TokensResponse>(`${this.baseUrl}/refresh`, {
      refresh_token: refreshToken,
    });
  }

  verifyEmail(token: string): Observable<ApiMessage> {
    return this.#http.get<ApiMessage>(`${this.baseUrl}/verify-email`, { params: { token } });
  }

  resendVerificationEmail(email: string, callbackUrl: string): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/resend-verification`, { email, callbackUrl });
  }

  forgotPassword(email: string, callbackUrl: string): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/forgot-password`, { email, callbackUrl });
  }

  resetPassword(token: string, password: string): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/reset-password`, { token, password });
  }

  logout(): Observable<void> {
    return this.#http.post<void>(`${this.baseUrl}/logout`, {});
  }

  logoutAll(): Observable<void> {
    return this.#http.post<void>(`${this.baseUrl}/logout-all`, {});
  }
}
