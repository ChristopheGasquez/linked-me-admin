import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, filter, finalize, switchMap, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  ConfirmDialog,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { AuthApiService } from '../../../../shared/services/auth-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { SessionResponse } from '../../../../shared/models/session.model';
import { toApiError } from '../../../../shared/utils/api-error';

@Component({
  selector: 'app-sessions-list',
  templateUrl: './sessions-list.html',
  styleUrl: './sessions-list.scss',
  imports: [TranslocoDirective, DatePipe, MatButton, MatProgressBar, MatTableModule, EmptyState],
})
export class SessionsList {
  #authApi = inject(AuthApiService);
  #authService = inject(AuthService);
  #dialog = inject(MatDialog);
  #router = inject(Router);

  readonly displayedColumns = ['createdAt', 'expiresAt', 'actions'];

  revoking = signal<number | null>(null);
  loggingOutAll = signal(false);
  #revokeError = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  // The API keeps at most 10 sessions per user; 100 is its maximum page size
  readonly sessionsResource = rxResource({
    stream: () => this.#authApi.getSessions({ limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  // Keeps the last result while reloading after a revoke (value() resets to undefined)
  readonly #lastResult = linkedSignal<
    PaginatedResponse<SessionResponse> | undefined,
    PaginatedResponse<SessionResponse> | undefined
  >({
    source: () => (this.sessionsResource.hasValue() ? this.sessionsResource.value() : undefined),
    computation: (result, previous) => result ?? previous?.value,
  });

  readonly sessions = computed(() => this.#lastResult()?.data ?? []);
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

  logoutAll(): void {
    const data: ConfirmDialogData = {
      titleKey: 'me.sessions.logoutAll.title',
      messageKey: 'me.sessions.logoutAll.confirm',
      confirmLabelKey: 'me.sessions.logoutAll.button',
    };
    this.#dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .pipe(
        filter(Boolean),
        tap(() => {
          this.loggingOutAll.set(true);
          this.#revokeError.set(null);
        }),
        switchMap(() => this.#authApi.logoutAll()),
        tap(() => {
          this.#authService.logout();
          this.#router.navigate(['/auth/login']);
        }),
        catchError((err: HttpErrorResponse) => {
          this.#revokeError.set(toApiError(err));
          return EMPTY;
        }),
        finalize(() => this.loggingOutAll.set(false)),
      )
      .subscribe();
  }
}
