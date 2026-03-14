import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { PaginatedResponse } from '../models/pagination.model';
import { UserAdminListParams, UserAdminResponse } from '../models/user-admin.model';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/admin/users`;
  }

  getUsers(params: UserAdminListParams = {}): Observable<PaginatedResponse<UserAdminResponse>> {
    return this.#http.get<PaginatedResponse<UserAdminResponse>>(this.baseUrl, { params: { ...params } });
  }

  getUserById(id: number): Observable<UserAdminResponse> {
    return this.#http.get<UserAdminResponse>(`${this.baseUrl}/${id}`);
  }
}
