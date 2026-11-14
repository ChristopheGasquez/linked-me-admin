import { Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { merge } from 'rxjs';
import { debounceTime, filter, map, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe, JsonPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { UrlService } from '../../../../core/services/url.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { DigitsOnlyDirective } from '../../../../shared/directives/digits-only.directive';
import { AuditApiService } from '../../../../shared/services/audit-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { AuditLogResponse } from '../../../../shared/models/audit-log.model';
import {
  isCanonical,
  parseOption,
  parsePositiveInt,
  sameValues,
  toQueryParams,
} from '../../../../shared/utils/list-query-params';

const PAGE_SIZES = [10, 20, 50];
const SORT_COLUMNS = ['createdAt'];
const SORT_ORDERS = ['asc', 'desc'] as const;

interface AuditQuery {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  actorId: number | null;
  action: string | null;
  targetType: string | null;
}

const DEFAULT_QUERY: AuditQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  actorId: null,
  action: null,
  targetType: null,
};

@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    JsonPipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIcon,
    MatProgressBar,
    MatPaginator,
    MatTableModule,
    MatSortModule,
    MatChipsModule,
    MatIconButton,
    MatTooltipModule,
    RouterLink,
    EmptyState,
    DigitsOnlyDirective,
  ],
})
export class AuditLogs {
  #auditApi = inject(AuditApiService);
  #authService = inject(AuthService);
  #urlService = inject(UrlService);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #fb: FormBuilder = inject(FormBuilder);

  readonly displayedColumns = ['createdAt', 'action', 'actor', 'target', 'metadata'];
  readonly actions = [
    'user.create',
    'user.delete',
    'user.role.assign',
    'user.role.revoke',
    'role.create',
    'role.delete',
    'role.permission.assign',
    'role.permission.revoke',
    'login.failed',
    'login.locked',
    'email.verified',
    'password.reset',
    'profile.update',
    'profile.delete',
    'profile.password.change',
    'task.cleanup.unverified-users',
    'task.cleanup.expired-tokens',
    'task.cleanup.audit-logs',
    'task.cleanup.orphaned-permissions',
  ];
  readonly targetTypes = ['user', 'role', 'task'];
  readonly targetRoutes: Record<string, string> = { user: 'users', role: 'roles' };
  readonly pageSizes = PAGE_SIZES;

  // Raw query params, bound by withComponentInputBinding
  readonly page = input<string>();
  readonly limit = input<string>();
  readonly sortBy = input<string>();
  readonly sortOrder = input<string>();
  readonly actorId = input<string>();
  readonly action = input<string>();
  readonly targetType = input<string>();

  // Last actorId synced between URL and form, so URL updates don't overwrite keystrokes still in debounce
  #syncedActorId: number | null | undefined;

  filterForm: FormGroup = this.#fb.group({
    actorId: [''],
    action: [''],
    targetType: [''],
  });

  readonly #rawQuery = computed(() => ({
    page: this.page(),
    limit: this.limit(),
    sortBy: this.sortBy(),
    sortOrder: this.sortOrder(),
    actorId: this.actorId(),
    action: this.action(),
    targetType: this.targetType(),
  }));

  readonly query = computed<AuditQuery>(
    () => {
      const raw = this.#rawQuery();
      return {
        page: parsePositiveInt(raw.page) ?? DEFAULT_QUERY.page,
        limit: parseOption(raw.limit, PAGE_SIZES) ?? DEFAULT_QUERY.limit,
        sortBy: parseOption(raw.sortBy, SORT_COLUMNS) ?? DEFAULT_QUERY.sortBy,
        sortOrder: parseOption(raw.sortOrder, SORT_ORDERS) ?? DEFAULT_QUERY.sortOrder,
        actorId: parsePositiveInt(raw.actorId),
        action: parseOption(raw.action, this.actions),
        targetType: parseOption(raw.targetType, this.targetTypes),
      };
    },
    { equal: sameValues },
  );

  readonly auditResource = rxResource({
    params: () => {
      const { actorId, action, targetType, ...rest } = this.query();
      return {
        ...rest,
        ...(actorId ? { actorId } : {}),
        ...(action ? { action } : {}),
        ...(targetType ? { targetType } : {}),
      };
    },
    stream: ({ params }) => this.#auditApi.getAuditLogs(params),
  });

  // Keeps the last result while a new page/sort/filter is loading (value() resets to undefined)
  readonly #lastResult = linkedSignal<
    PaginatedResponse<AuditLogResponse> | undefined,
    PaginatedResponse<AuditLogResponse> | undefined
  >({
    source: () => (this.auditResource.hasValue() ? this.auditResource.value() : undefined),
    computation: (result, previous) => result ?? previous?.value,
  });

  readonly auditLogs = computed(() => this.#lastResult()?.data ?? []);
  readonly total = computed(() => this.#lastResult()?.meta.total ?? 0);
  readonly loading = this.auditResource.isLoading;
  readonly error = computed(() => {
    const err = this.auditResource.error() as HttpErrorResponse | undefined;
    return err ? { code: err.error?.code ?? 'unknown', params: err.error?.params } : null;
  });
  // Filtered view or page out of range: the empty state offers a reset to the base view
  readonly canResetView = computed(() => {
    const { actorId, action, targetType, page } = this.query();
    return !!(actorId || action || targetType) || page > 1;
  });

  readonly sortIcons = computed(() => {
    const { sortBy: active, sortOrder } = this.query();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : sortOrder === 'asc' ? 'expand_less' : 'expand_more';
    return { createdAt: icon('createdAt') };
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.query().limit));
  readonly canViewAdmin = computed(
    () => !!this.#authService.currentUser()?.permissions.includes('realm:admin'),
  );

  constructor() {
    this.#urlService.trackListUrl();

    // Invalid or default-valued params are removed from the URL
    effect(() => {
      const params = toQueryParams(this.query(), DEFAULT_QUERY);
      if (!isCanonical(this.#rawQuery(), params)) {
        untracked(() => this.#navigate(params));
      }
    });

    // URL → form (also fills the form on init)
    effect(() => {
      const { actorId, action, targetType } = this.query();
      untracked(() => {
        if (actorId !== this.#syncedActorId) {
          this.#syncedActorId = actorId;
          this.filterForm.controls['actorId'].setValue(actorId ?? '', { emitEvent: false });
        }
        this.filterForm.patchValue(
          { action: action ?? '', targetType: targetType ?? '' },
          { emitEvent: false },
        );
      });
    });

    // Form → URL
    this.filterForm.controls['actorId'].valueChanges
      .pipe(
        debounceTime(300),
        map((value) => parsePositiveInt(String(value ?? ''))),
        filter((actorId) => actorId !== this.#syncedActorId),
        tap((actorId) => {
          this.#syncedActorId = actorId;
          this.#updateQuery({ actorId, page: 1 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    merge(
      this.filterForm.controls['action'].valueChanges.pipe(
        map((action) => ({ action: action || null })),
      ),
      this.filterForm.controls['targetType'].valueChanges.pipe(
        map((targetType) => ({ targetType: targetType || null })),
      ),
    )
      .pipe(
        tap((change) => this.#updateQuery({ ...change, page: 1 })),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  onPageChange(event: PageEvent): void {
    this.#updateQuery({ page: event.pageIndex + 1, limit: event.pageSize });
  }

  onSortChange(sort: Sort): void {
    this.#updateQuery({
      sortBy: sort.active || DEFAULT_QUERY.sortBy,
      sortOrder: (sort.direction as 'asc' | 'desc') || DEFAULT_QUERY.sortOrder,
      page: 1,
    });
  }

  clearActorId(): void {
    this.filterForm.controls['actorId'].setValue('');
  }

  resetView(): void {
    this.#navigate(toQueryParams(DEFAULT_QUERY, DEFAULT_QUERY));
  }

  #updateQuery(change: Partial<AuditQuery>): void {
    this.#navigate(toQueryParams({ ...this.query(), ...change }, DEFAULT_QUERY));
  }

  #navigate(queryParams: Params): void {
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
