import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { LoginResponse, RegisterResponse } from '../models/auth.model';
import { LoginDto, RegisterDto } from '../models/login.dto';
import { MeResponse } from '../models/me.model';
import { ApiMessage } from '../models/api-response.model';
import { PaginatedResponse, PaginationParams } from '../models/pagination.model';
import { SessionResponse } from '../models/session.model';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/auth`;
  }

  register(dto: RegisterDto, captchaToken: string): Observable<RegisterResponse> {
    return this.#http.post<RegisterResponse>(
      `${this.baseUrl}/register`,
      dto,
      this.#captcha(captchaToken),
    );
  }

  login(dto: LoginDto, captchaToken: string): Observable<LoginResponse> {
    return this.#http.post<LoginResponse>(
      `${this.baseUrl}/login`,
      dto,
      this.#captcha(captchaToken),
    );
  }

  getMe(): Observable<MeResponse> {
    return this.#http.get<MeResponse>(`${this.baseUrl}/me`);
  }

  refresh(): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/refresh`, {});
  }

  verifyEmail(token: string): Observable<ApiMessage> {
    return this.#http.get<ApiMessage>(`${this.baseUrl}/verify-email`, { params: { token } });
  }

  resendVerificationEmail(
    email: string,
    callbackUrl: string,
    captchaToken: string,
  ): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(
      `${this.baseUrl}/resend-verification`,
      { email, callbackUrl },
      this.#captcha(captchaToken),
    );
  }

  forgotPassword(email: string, callbackUrl: string, captchaToken: string): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(
      `${this.baseUrl}/forgot-password`,
      { email, callbackUrl },
      this.#captcha(captchaToken),
    );
  }

  resetPassword(token: string, password: string): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/reset-password`, { token, password });
  }

  logout(): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/logout`, {});
  }

  logoutAll(): Observable<void> {
    return this.#http.post<void>(`${this.baseUrl}/logout-all`, {});
  }

  getSessions(params: PaginationParams = {}): Observable<PaginatedResponse<SessionResponse>> {
    return this.#http.get<PaginatedResponse<SessionResponse>>(`${this.baseUrl}/sessions`, {
      params: { ...params },
    });
  }

  revokeSession(id: string): Observable<ApiMessage> {
    return this.#http.delete<ApiMessage>(`${this.baseUrl}/sessions/${id}`);
  }

  // Only on the captcha-protected routes, never globally
  #captcha(token: string): { headers: Record<string, string> } {
    return { headers: { 'X-Turnstile-Token': token } };
  }
}
