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

  resendVerificationEmail(email: string): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/resend-verification`, { email });
  }

  logout(): Observable<void> {
    return this.#http.post<void>(`${this.baseUrl}/logout`, {});
  }

  logoutAll(): Observable<void> {
    return this.#http.post<void>(`${this.baseUrl}/logout-all`, {});
  }
}
