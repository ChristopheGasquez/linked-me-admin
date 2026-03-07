import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { AuthApiService } from '../../../../shared/services/auth-api.service';
import { SessionResponse } from '../../../../shared/models/session.model';

@Component({
  selector: 'app-sessions-list',
  templateUrl: './sessions-list.html',
  styleUrl: './sessions-list.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    MatButton,
    MatIcon,
    MatProgressBar,
    MatPaginator,
    MatTableModule,
  ],
})
export class SessionsList implements OnInit {
  #authApi = inject(AuthApiService);

  sessions = signal<SessionResponse[]>([]);
  loading = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  revoking = signal<number | null>(null);
  page = signal(1);
  limit = signal(10);
  total = signal(0);

  readonly displayedColumns = ['createdAt', 'expiresAt', 'actions'];

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.#authApi
      .getSessions({
        page: this.page(),
        limit: this.limit(),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      .pipe(
        tap((res) => {
          this.sessions.set(res.data);
          this.total.set(res.meta.total);
        }),
        catchError((err: HttpErrorResponse) => {
          this.error.set({ code: err.error?.code ?? 'unknown' });
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }

  revokeSession(id: number): void {
    this.revoking.set(id);
    this.#authApi
      .revokeSession(id)
      .pipe(
        tap(() => this.loadSessions()),
        catchError((err: HttpErrorResponse) => {
          this.error.set({ code: err.error?.code ?? 'unknown' });
          return EMPTY;
        }),
        finalize(() => this.revoking.set(null)),
      )
      .subscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.loadSessions();
  }
}
