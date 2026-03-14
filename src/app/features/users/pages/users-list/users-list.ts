import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, takeUntil, tap } from 'rxjs/operators';
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

import { UsersApiService } from '../../../../shared/services/users-api.service';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { UserAdminResponse } from '../../../../shared/models/user-admin.model';
import { RoleBasicResponse } from '../../../../shared/models/role.model';

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
  ],
})
export class UsersList implements OnInit, OnDestroy {
  #usersApi = inject(UsersApiService);
  #rolesApi = inject(RolesApiService);
  #router = inject(Router);
  #fb: FormBuilder = inject(FormBuilder);
  #destroy$ = new Subject<void>();

  readonly displayedColumns = ['identity', 'roles', 'isEmailChecked', 'createdAt', 'actions'];

  users = signal<UserAdminResponse[]>([]);
  loading = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  page = signal(1);
  limit = signal(20);
  total = signal(0);
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  availableRoles = signal<RoleBasicResponse[]>([]);

  filterForm: FormGroup = this.#fb.group({
    search: [''],
    role: [''],
    emailChecked: [''],
  });

  readonly sortIcons = computed(() => {
    const active = this.sortBy();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : this.sortOrder() === 'asc' ? 'expand_less' : 'expand_more';
    return { name: icon('name'), isEmailChecked: icon('isEmailChecked'), createdAt: icon('createdAt') };
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadUsers();

    this.filterForm.controls['search'].valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.page.set(1);
          this.loadUsers();
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe();

    merge(
      this.filterForm.controls['role'].valueChanges,
      this.filterForm.controls['emailChecked'].valueChanges,
    )
      .pipe(
        tap(() => {
          this.page.set(1);
          this.loadUsers();
        }),
        takeUntil(this.#destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
    this.#destroy$.complete();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);

    const { search, role, emailChecked } = this.filterForm.getRawValue();
    const params = {
      page: this.page(),
      limit: this.limit(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(emailChecked !== '' ? { isEmailChecked: emailChecked === 'true' } : {}),
    };

    this.#usersApi
      .getUsers(params)
      .pipe(
        tap((res) => {
          this.users.set(res.data);
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

  loadRoles(): void {
    this.#rolesApi
      .getRoles({ limit: 100 })
      .pipe(
        tap((res) => this.availableRoles.set(res.data)),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.loadUsers();
  }

  onSortChange(sort: Sort): void {
    this.sortBy.set(sort.active || 'createdAt');
    this.sortOrder.set((sort.direction as 'asc' | 'desc') || 'desc');
    this.page.set(1);
    this.loadUsers();
  }

  navigateToUser(id: number): void {
    this.#router.navigate(['/admin/users', id]);
  }

  clearSearch(): void {
    this.filterForm.controls['search'].setValue('', { emitEvent: false });
    this.page.set(1);
    this.loadUsers();
  }
}
