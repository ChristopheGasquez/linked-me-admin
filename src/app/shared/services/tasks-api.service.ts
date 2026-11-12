import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AppConfigService } from '../../core/services/app-config.service';
import { ApiMessage } from '../models/api-response.model';
import { CleanupAuditLogsDto, TaskName } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  #http = inject(HttpClient);
  #config = inject(AppConfigService);

  private get baseUrl(): string {
    return `${this.#config.apiUrl}/tasks`;
  }

  runCleanup(task: 'audit-logs', body: CleanupAuditLogsDto): Observable<ApiMessage>;
  runCleanup(task: Exclude<TaskName, 'audit-logs'>): Observable<ApiMessage>;
  runCleanup(task: TaskName, body?: CleanupAuditLogsDto): Observable<ApiMessage> {
    return this.#http.post<ApiMessage>(`${this.baseUrl}/cleanup-${task}`, body ?? {});
  }
}
