import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { ApiMessage } from '../models/api-response.model';
import { PaginatedResponse } from '../models/pagination.model';
import { PermissionListParams, PermissionResponse } from '../models/permission.model';
import { RoleBasicResponse, RoleListParams, RoleResponse } from '../models/role.model';

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

  getRoleById(id: number): Observable<RoleResponse> {
    return this.#http.get<RoleResponse>(`${this.baseUrl}/${id}`);
  }

  createRole(name: string): Observable<RoleBasicResponse> {
    return this.#http.post<RoleBasicResponse>(this.baseUrl, { name });
  }

  deleteRole(id: number): Observable<ApiMessage> {
    return this.#http.delete<ApiMessage>(`${this.baseUrl}/${id}`);
  }

  addPermissions(id: number, permissions: string[]): Observable<RoleResponse> {
    return this.#http.post<RoleResponse>(`${this.baseUrl}/${id}/permissions`, { permissions });
  }

  removePermission(id: number, permissionId: number): Observable<ApiMessage> {
    return this.#http.delete<ApiMessage>(`${this.baseUrl}/${id}/permissions/${permissionId}`);
  }

  getPermissions(params: PermissionListParams = {}): Observable<PaginatedResponse<PermissionResponse>> {
    return this.#http.get<PaginatedResponse<PermissionResponse>>(`${this.#config.apiUrl}/admin/permissions`, {
      params: { ...params },
    });
  }
}
