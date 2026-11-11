import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { PaginatedResponse } from '../models/pagination.model';
import { AuditLogListParams, AuditLogResponse } from '../models/audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/admin/audit-logs`;
  }

  getAuditLogs(params: AuditLogListParams = {}): Observable<PaginatedResponse<AuditLogResponse>> {
    return this.#http.get<PaginatedResponse<AuditLogResponse>>(this.baseUrl, { params: { ...params } });
  }
}
