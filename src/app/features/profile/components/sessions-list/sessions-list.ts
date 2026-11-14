import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { AuthApiService } from '../../../../shared/services/auth-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { SessionResponse } from '../../../../shared/models/session.model';
import { toApiError } from '../../../../shared/utils/api-error';

@Component({
  selector: 'app-sessions-list',
  templateUrl: './sessions-list.html',
  styleUrl: './sessions-list.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    MatButton,
    MatProgressBar,
    MatPaginator,
    MatTableModule,
    EmptyState,
  ],
})
export class SessionsList {
  #authApi = inject(AuthApiService);

  readonly displayedColumns = ['createdAt', 'expiresAt', 'actions'];

  revoking = signal<number | null>(null);
  page = signal(1);
  limit = signal(10);
  #revokeError = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  readonly sessionsResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      sortBy: 'createdAt',
      sortOrder: 'desc' as const,
    }),
    stream: ({ params }) => this.#authApi.getSessions(params),
  });

  // Keeps the last result while a new page is loading (value() resets to undefined)
  readonly #lastResult = linkedSignal<
    PaginatedResponse<SessionResponse> | undefined,
    PaginatedResponse<SessionResponse> | undefined
  >({
    source: () => (this.sessionsResource.hasValue() ? this.sessionsResource.value() : undefined),
    computation: (result, previous) => result ?? previous?.value,
  });

  readonly sessions = computed(() => this.#lastResult()?.data ?? []);
  readonly total = computed(() => this.#lastResult()?.meta.total ?? 0);
  readonly loading = this.sessionsResource.isLoading;
  readonly error = computed(() => {
    const err = this.sessionsResource.error() as HttpErrorResponse | undefined;
    return this.#revokeError() ?? (err ? toApiError(err) : null);
  });

  revokeSession(id: number): void {
    this.revoking.set(id);
    this.#revokeError.set(null);
    this.#authApi
      .revokeSession(id)
      .pipe(
        tap(() => this.sessionsResource.reload()),
        catchError((err: HttpErrorResponse) => {
          this.#revokeError.set(toApiError(err));
          return EMPTY;
        }),
        finalize(() => this.revoking.set(null)),
      )
      .subscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
  }
}
