import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
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

import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialog, ConfirmDialogData } from '../confirm-dialog/confirm-dialog';
import { EmptyState } from '../empty-state/empty-state';
import { AuthApiService } from '../../services/auth-api.service';
import { UsersApiService } from '../../services/users-api.service';
import { PaginatedResponse } from '../../models/pagination.model';
import { SessionResponse } from '../../models/session.model';
import { toApiError } from '../../utils/api-error';

@Component({
  selector: 'app-sessions-list',
  templateUrl: './sessions-list.html',
  styleUrl: './sessions-list.scss',
  imports: [TranslocoDirective, DatePipe, MatButton, MatProgressBar, MatTableModule, EmptyState],
})
export class SessionsList {
  #authApi = inject(AuthApiService);
  #usersApi = inject(UsersApiService);
  #authService = inject(AuthService);
  #dialog = inject(MatDialog);
  #router = inject(Router);

  // Admin view of another user's sessions; the signed-in user's own sessions when undefined
  readonly userId = input<string>();

  revoking = signal<string | null>(null);
  loggingOutAll = signal(false);
  #revokeError = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  // The API keeps at most 10 sessions per user; 100 is its maximum page size
  readonly sessionsResource = rxResource({
    params: () => ({ userId: this.userId() }),
    stream: ({ params: { userId } }) => {
      const query = { limit: 100, sortBy: 'createdAt', sortOrder: 'desc' } as const;
      return userId === undefined
        ? this.#authApi.getSessions(query)
        : this.#usersApi.getSessions(userId, query);
    },
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
  readonly canRevoke = computed(
    () =>
      this.userId() === undefined ||
      !!this.#authService.currentUser()?.permissions.includes('admin:user:session:revoke'),
  );
  readonly displayedColumns = computed(() =>
    this.canRevoke() ? ['createdAt', 'expiresAt', 'actions'] : ['createdAt', 'expiresAt'],
  );
  // Revoking every session of your own account signs this device out too
  readonly #isOwn = computed(
    () => this.userId() === undefined || this.userId() === this.#authService.currentUser()?.id,
  );
  readonly loading = this.sessionsResource.isLoading;
  readonly error = computed(() => {
    const err = this.sessionsResource.error() as HttpErrorResponse | undefined;
    return this.#revokeError() ?? (err ? toApiError(err) : null);
  });

  revokeSession(id: string): void {
    this.revoking.set(id);
    this.#revokeError.set(null);
    const userId = this.userId();
    const revoke$ =
      userId === undefined
        ? this.#authApi.revokeSession(id)
        : this.#usersApi.revokeSession(userId, id);
    revoke$
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
    const userId = this.userId();
    const data: ConfirmDialogData = {
      titleKey: 'common.sessions.logoutAll.title',
      messageKey: `common.sessions.logoutAll.${this.#isOwn() ? 'confirmOwn' : 'confirmUser'}`,
      confirmLabelKey: 'common.sessions.logoutAll.button',
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
        switchMap(() =>
          userId === undefined ? this.#authApi.logoutAll() : this.#usersApi.revokeSessions(userId),
        ),
        tap(() => {
          if (this.#isOwn()) {
            this.#authService.logout();
            this.#router.navigate(['/auth/login']);
          } else {
            this.sessionsResource.reload();
          }
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
