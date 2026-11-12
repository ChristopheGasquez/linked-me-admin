import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
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

import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { AuditApiService } from '../../../../shared/services/audit-api.service';
import { PaginatedResponse } from '../../../../shared/models/pagination.model';
import { AuditLogResponse } from '../../../../shared/models/audit-log.model';

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
    EmptyState,
  ],
})
export class AuditLogs {
  #auditApi = inject(AuditApiService);
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

  limit = signal(20);
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');

  filterForm: FormGroup = this.#fb.group({
    actorId: [''],
    action: [''],
    targetType: [''],
  });

  readonly #actorId = toSignal(
    this.filterForm.controls['actorId'].valueChanges.pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );
  readonly #action = toSignal(this.filterForm.controls['action'].valueChanges, { initialValue: '' });
  readonly #targetType = toSignal(this.filterForm.controls['targetType'].valueChanges, { initialValue: '' });

  // Back to first page whenever a filter or sort changes
  page = linkedSignal({
    source: () => [this.#actorId(), this.#action(), this.#targetType(), this.sortBy(), this.sortOrder()],
    computation: () => 1,
  });

  readonly auditResource = rxResource({
    params: () => ({
      page: this.page(),
      limit: this.limit(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      ...(Number(this.#actorId()) > 0 ? { actorId: Number(this.#actorId()) } : {}),
      ...(this.#action() ? { action: this.#action() } : {}),
      ...(this.#targetType() ? { targetType: this.#targetType() } : {}),
    }),
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
  readonly hasActiveFilters = computed(() => !!(this.#actorId() || this.#action() || this.#targetType()));

  readonly sortIcons = computed(() => {
    const active = this.sortBy();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : this.sortOrder() === 'asc' ? 'expand_less' : 'expand_more';
    return { createdAt: icon('createdAt') };
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

  clearActorId(): void {
    this.filterForm.controls['actorId'].setValue('');
  }

  resetFilters(): void {
    this.filterForm.reset({ actorId: '', action: '', targetType: '' });
  }
}
