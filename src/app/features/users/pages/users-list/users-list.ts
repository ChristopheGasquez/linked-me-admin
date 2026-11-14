import { Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { merge } from 'rxjs';
import { debounceTime, filter, map, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
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

import { UrlService } from '../../../../core/services/url.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { UserAdminResponse } from '../../../../shared/models/user-admin.model';
import {
  isCanonical,
  parseOption,
  parsePositiveInt,
  sameValues,
  toQueryParams,
} from '../../../../shared/utils/list-query-params';

const PAGE_SIZES = [10, 20, 50];
const SORT_COLUMNS = ['name', 'createdAt'];
const SORT_ORDERS = ['asc', 'desc'] as const;
const EMAIL_CHECKED_OPTIONS = ['true', 'false'] as const;

interface UsersQuery {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string | null;
  role: string | null;
  isEmailChecked: 'true' | 'false' | null;
}

const DEFAULT_QUERY: UsersQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  search: null,
  role: null,
  isEmailChecked: null,
};

@Component({
  selector: 'app-users-list',
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
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
    EmptyState,
  ],
})
export class UsersList {
  #usersApi = inject(UsersApiService);
  #rolesApi = inject(RolesApiService);
  #urlService = inject(UrlService);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #fb: FormBuilder = inject(FormBuilder);

  readonly displayedColumns = ['identity', 'roles', 'isEmailChecked', 'createdAt', 'actions'];
  readonly pageSizes = PAGE_SIZES;

  // Raw query params, bound by withComponentInputBinding
  readonly page = input<string>();
  readonly limit = input<string>();
  readonly sortBy = input<string>();
  readonly sortOrder = input<string>();
  readonly search = input<string>();
  readonly role = input<string>();
  readonly isEmailChecked = input<string>();

  // Last search synced between URL and form, so URL updates don't overwrite keystrokes still in debounce
  #syncedSearch: string | null | undefined;

  filterForm: FormGroup = this.#fb.group({
    search: [''],
    role: [''],
    isEmailChecked: [''],
  });

  readonly #rolesResource = rxResource({
    stream: () => this.#rolesApi.getRoles({ limit: 100 }),
  });

  readonly availableRoles = computed(() =>
    this.#rolesResource.hasValue() ? this.#rolesResource.value().data : [],
  );

  readonly #rawQuery = computed(() => ({
    page: this.page(),
    limit: this.limit(),
    sortBy: this.sortBy(),
    sortOrder: this.sortOrder(),
    search: this.search(),
    role: this.role(),
    isEmailChecked: this.isEmailChecked(),
  }));

  readonly query = computed<UsersQuery>(
    () => {
      const raw = this.#rawQuery();
      return {
        page: parsePositiveInt(raw.page) ?? DEFAULT_QUERY.page,
        limit: parseOption(raw.limit, PAGE_SIZES) ?? DEFAULT_QUERY.limit,
        sortBy: parseOption(raw.sortBy, SORT_COLUMNS) ?? DEFAULT_QUERY.sortBy,
        sortOrder: parseOption(raw.sortOrder, SORT_ORDERS) ?? DEFAULT_QUERY.sortOrder,
        search: raw.search?.trim() || null,
        // Trusted until roles are loaded, then validated against them
        role: this.#rolesResource.hasValue()
          ? parseOption(
              raw.role,
              this.availableRoles().map((role) => role.name),
            )
          : raw.role || null,
        isEmailChecked: parseOption(raw.isEmailChecked, EMAIL_CHECKED_OPTIONS),
      };
    },
    { equal: sameValues },
  );

  readonly usersResource = rxResource({
    params: () => {
      const { search, role, isEmailChecked, ...rest } = this.query();
      return {
        ...rest,
        ...(search ? { search } : {}),
        ...(role ? { role } : {}),
        ...(isEmailChecked ? { isEmailChecked: isEmailChecked === 'true' } : {}),
      };
    },
    stream: ({ params }) => this.#usersApi.getUsers(params),
  });

  // Keeps the last result while a new page/sort/filter is loading (value() resets to undefined)
  readonly #lastResult = linkedSignal<
    PaginatedResponse<UserAdminResponse> | undefined,
    PaginatedResponse<UserAdminResponse> | undefined
  >({
    source: () => (this.usersResource.hasValue() ? this.usersResource.value() : undefined),
    computation: (result, previous) => result ?? previous?.value,
  });

  readonly users = computed(() => this.#lastResult()?.data ?? []);
  readonly total = computed(() => this.#lastResult()?.meta.total ?? 0);
  readonly loading = this.usersResource.isLoading;
  readonly error = computed(() => {
    const err = this.usersResource.error() as HttpErrorResponse | undefined;
    return err ? { code: err.error?.code ?? 'unknown', params: err.error?.params } : null;
  });
  // Filtered view or page out of range: the empty state offers a reset to the base view
  readonly canResetView = computed(() => {
    const { search, role, isEmailChecked, page } = this.query();
    return !!(search || role || isEmailChecked) || page > 1;
  });

  readonly sortIcons = computed(() => {
    const { sortBy: active, sortOrder } = this.query();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : sortOrder === 'asc' ? 'expand_less' : 'expand_more';
    return { name: icon('name'), createdAt: icon('createdAt') };
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.query().limit));

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
      const { search, role, isEmailChecked } = this.query();
      untracked(() => {
        if (search !== this.#syncedSearch) {
          this.#syncedSearch = search;
          this.filterForm.controls['search'].setValue(search ?? '', { emitEvent: false });
        }
        this.filterForm.patchValue(
          { role: role ?? '', isEmailChecked: isEmailChecked ?? '' },
          { emitEvent: false },
        );
      });
    });

    // Form → URL
    this.filterForm.controls['search'].valueChanges
      .pipe(
        debounceTime(300),
        map((value: string) => value.trim() || null),
        filter((search) => search !== this.#syncedSearch),
        tap((search) => {
          this.#syncedSearch = search;
          this.#updateQuery({ search, page: 1 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    merge(
      this.filterForm.controls['role'].valueChanges.pipe(map((role) => ({ role: role || null }))),
      this.filterForm.controls['isEmailChecked'].valueChanges.pipe(
        map((isEmailChecked) => ({ isEmailChecked: isEmailChecked || null })),
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

  navigateToUser(id: number): void {
    this.#router.navigate(['/admin/users', id]);
  }

  clearSearch(): void {
    this.filterForm.controls['search'].setValue('');
  }

  resetView(): void {
    this.#navigate(toQueryParams(DEFAULT_QUERY, DEFAULT_QUERY));
  }

  #updateQuery(change: Partial<UsersQuery>): void {
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
