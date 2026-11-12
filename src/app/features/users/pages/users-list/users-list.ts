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
import { MatSelectModule } from '@angular/material/select';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { UserAdminResponse } from '../../../../shared/models/user-admin.model';

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
  #router = inject(Router);
  #fb: FormBuilder = inject(FormBuilder);

  readonly displayedColumns = ['identity', 'roles', 'isEmailChecked', 'createdAt', 'actions'];

  limit = signal(20);
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  filterForm: FormGroup = this.#fb.group({
    search: [''],
    role: [''],
    emailChecked: [''],
  });

  readonly #search = toSignal(
    this.filterForm.controls['search'].valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );
  readonly #role = toSignal(this.filterForm.controls['role'].valueChanges, { initialValue: '' });
  readonly #emailChecked = toSignal(this.filterForm.controls['emailChecked'].valueChanges, { initialValue: '' });

  // Back to first page whenever a filter or sort changes
  page = linkedSignal({
    source: () => [this.#search(), this.#role(), this.#emailChecked(), this.sortBy(), this.sortOrder()],
    computation: () => 1,
  });

  readonly usersResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      ...(this.#search() ? { search: this.#search() } : {}),
      ...(this.#role() ? { role: this.#role() } : {}),
      ...(this.#emailChecked() !== '' ? { isEmailChecked: this.#emailChecked() === 'true' } : {}),
    }),
    stream: ({ params }) => this.#usersApi.getUsers(params),
  });

  readonly #rolesResource = rxResource({
    stream: () => this.#rolesApi.getRoles({ limit: 100 }),
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
  readonly availableRoles = computed(() => (this.#rolesResource.hasValue() ? this.#rolesResource.value().data : []));
  readonly hasActiveFilters = computed(() => !!(this.#search() || this.#role() || this.#emailChecked() !== ''));

  readonly sortIcons = computed(() => {
    const active = this.sortBy();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : this.sortOrder() === 'asc' ? 'expand_less' : 'expand_more';
    return { name: icon('name'), isEmailChecked: icon('isEmailChecked'), createdAt: icon('createdAt') };
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

  navigateToUser(id: number): void {
    this.#router.navigate(['/admin/users', id]);
  }

  clearSearch(): void {
    this.filterForm.controls['search'].setValue('');
  }

  resetFilters(): void {
    this.filterForm.reset({ search: '', role: '', emailChecked: '' });
  }
}
