import { Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { debounceTime, filter, map, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UrlService } from '../../../../core/services/url.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { RoleResponse } from '../../../../shared/models/role.model';
import {
  isCanonical,
  parseOption,
  parsePositiveInt,
  sameValues,
  toQueryParams,
} from '../../../../shared/utils/list-query-params';

const PAGE_SIZES = [10, 20, 50];
const SORT_COLUMNS = ['name', 'createdAt', 'updatedAt'];
const SORT_ORDERS = ['asc', 'desc'] as const;

interface RolesQuery {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string | null;
}

const DEFAULT_QUERY: RolesQuery = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  search: null,
};

@Component({
  selector: 'app-roles-list',
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatProgressBar,
    MatPaginator,
    MatTableModule,
    MatSortModule,
    MatButton,
    MatIconButton,
    MatTooltipModule,
    EmptyState,
    HasPermissionDirective,
  ],
})
export class RolesList {
  #rolesApi = inject(RolesApiService);
  #urlService = inject(UrlService);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #fb: FormBuilder = inject(FormBuilder);

  readonly displayedColumns = ['name', 'permissions', 'createdAt', 'updatedAt', 'actions'];
  readonly pageSizes = PAGE_SIZES;

  // Raw query params, bound by withComponentInputBinding
  readonly page = input<string>();
  readonly limit = input<string>();
  readonly sortBy = input<string>();
  readonly sortOrder = input<string>();
  readonly search = input<string>();

  // Last search synced between URL and form, so URL updates don't overwrite keystrokes still in debounce
  #syncedSearch: string | null | undefined;

  filterForm: FormGroup = this.#fb.group({
    search: [''],
  });

  readonly #rawQuery = computed(() => ({
    page: this.page(),
    limit: this.limit(),
    sortBy: this.sortBy(),
    sortOrder: this.sortOrder(),
    search: this.search(),
  }));

  readonly query = computed<RolesQuery>(
    () => {
      const raw = this.#rawQuery();
      return {
        page: parsePositiveInt(raw.page) ?? DEFAULT_QUERY.page,
        limit: parseOption(raw.limit, PAGE_SIZES) ?? DEFAULT_QUERY.limit,
        sortBy: parseOption(raw.sortBy, SORT_COLUMNS) ?? DEFAULT_QUERY.sortBy,
        sortOrder: parseOption(raw.sortOrder, SORT_ORDERS) ?? DEFAULT_QUERY.sortOrder,
        search: raw.search?.trim() || null,
      };
    },
    { equal: sameValues },
  );

  readonly rolesResource = rxResource({
    params: () => {
      const { search, ...rest } = this.query();
      return { ...rest, ...(search ? { search } : {}) };
    },
    stream: ({ params }) => this.#rolesApi.getRoles(params),
  });

  // Keeps the last result while a new page/sort/search is loading (value() resets to undefined)
  readonly #lastResult = linkedSignal<
    PaginatedResponse<RoleResponse> | undefined,
    PaginatedResponse<RoleResponse> | undefined
  >({
    source: () => (this.rolesResource.hasValue() ? this.rolesResource.value() : undefined),
    computation: (result, previous) => result ?? previous?.value,
  });

  readonly roles = computed(() => this.#lastResult()?.data ?? []);
  readonly total = computed(() => this.#lastResult()?.meta.total ?? 0);
  readonly loading = this.rolesResource.isLoading;
  readonly error = computed(() => {
    const err = this.rolesResource.error() as HttpErrorResponse | undefined;
    return err ? { code: err.error?.code ?? 'unknown', params: err.error?.params } : null;
  });
  // Filtered view or page out of range: the empty state offers a reset to the base view
  readonly canResetView = computed(() => !!this.query().search || this.query().page > 1);

  readonly sortIcons = computed(() => {
    const { sortBy: active, sortOrder } = this.query();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : sortOrder === 'asc' ? 'expand_less' : 'expand_more';
    return { name: icon('name'), createdAt: icon('createdAt'), updatedAt: icon('updatedAt') };
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
      const { search } = this.query();
      untracked(() => {
        if (search !== this.#syncedSearch) {
          this.#syncedSearch = search;
          this.filterForm.controls['search'].setValue(search ?? '', { emitEvent: false });
        }
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

  navigateToRole(id: number): void {
    this.#router.navigate(['/admin/roles', id]);
  }

  clearSearch(): void {
    this.filterForm.controls['search'].setValue('');
  }

  resetView(): void {
    this.#navigate(toQueryParams(DEFAULT_QUERY, DEFAULT_QUERY));
  }

  #updateQuery(change: Partial<RolesQuery>): void {
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
