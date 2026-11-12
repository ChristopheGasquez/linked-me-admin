import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { PaginatedResponse } from '../models/pagination.model';
import { RoleListParams, RoleResponse } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RolesApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/admin/roles`;
  }

  getRoles(params: RoleListParams = {}): Observable<PaginatedResponse<RoleResponse>> {
    return this.#http.get<PaginatedResponse<RoleResponse>>(this.baseUrl, { params: { ...params } });
  }
}
