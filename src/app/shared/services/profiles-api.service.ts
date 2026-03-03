import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { ApiMessage } from '../models/api-response.model';
import { ProfileResponse } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfilesApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/profiles`;
  }

  updateProfile(name: string): Observable<ProfileResponse> {
    return this.#http.patch<ProfileResponse>(`${this.baseUrl}/me`, { name });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiMessage> {
    return this.#http.patch<ApiMessage>(`${this.baseUrl}/me/password`, { currentPassword, newPassword });
  }
}
