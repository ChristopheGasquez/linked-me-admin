import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { RoleResponse } from '../../../../shared/models/role.model';

@Component({
  selector: 'app-roles-list',
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIcon,
    MatProgressBar,
    MatPaginator,
    MatTableModule,
    MatSortModule,
    MatIconButton,
    MatTooltipModule,
    EmptyState,
  ],
})
export class RolesList {
  #rolesApi = inject(RolesApiService);
  #router = inject(Router);
  #fb: FormBuilder = inject(FormBuilder);

  readonly displayedColumns = ['name', 'permissions', 'createdAt', 'updatedAt', 'actions'];

  limit = signal(20);
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  filterForm: FormGroup = this.#fb.group({
    search: [''],
  });

  readonly #search = toSignal(
    this.filterForm.controls['search'].valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  // Back to first page whenever search or sort changes
  page = linkedSignal({
    source: () => [this.#search(), this.sortBy(), this.sortOrder()],
    computation: () => 1,
  });

  readonly rolesResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      ...(this.#search() ? { search: this.#search() } : {}),
    }),
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
  readonly hasActiveFilters = computed(() => !!this.#search());

  readonly sortIcons = computed(() => {
    const active = this.sortBy();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : this.sortOrder() === 'asc' ? 'expand_less' : 'expand_more';
    return { name: icon('name'), createdAt: icon('createdAt'), updatedAt: icon('updatedAt') };
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
  }

  onSortChange(sort: Sort): void {
    this.sortBy.set(sort.active || 'createdAt');
    this.sortOrder.set((sort.direction as 'asc' | 'desc') || 'desc');
  }

  navigateToRole(id: number): void {
    this.#router.navigate(['/admin/roles', id]);
  }

  clearSearch(): void {
    this.filterForm.controls['search'].setValue('');
  }

  resetFilters(): void {
    this.filterForm.reset({ search: '' });
  }
}
