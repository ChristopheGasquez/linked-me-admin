import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, merge } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, tap } from 'rxjs/operators';
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
export class AuditLogs implements OnInit {
  #auditApi = inject(AuditApiService);
  #fb: FormBuilder = inject(FormBuilder);
  #destroyRef = inject(DestroyRef);

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

  auditLogs = signal<AuditLogResponse[]>([]);
  loading = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  page = signal(1);
  limit = signal(20);
  total = signal(0);
  sortBy = signal('createdAt');
  sortOrder = signal<'asc' | 'desc'>('desc');
  hasActiveFilters = signal(false);

  filterForm: FormGroup = this.#fb.group({
    actorId: [''],
    action: [''],
    targetType: [''],
  });

  readonly sortIcons = computed(() => {
    const active = this.sortBy();
    const icon = (col: string) =>
      active !== col ? 'unfold_more' : this.sortOrder() === 'asc' ? 'expand_less' : 'expand_more';
    return { createdAt: icon('createdAt') };
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadAuditLogs();

    this.filterForm.controls['actorId'].valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.page.set(1);
          this.loadAuditLogs();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();

    merge(
      this.filterForm.controls['action'].valueChanges,
      this.filterForm.controls['targetType'].valueChanges,
    )
      .pipe(
        tap(() => {
          this.page.set(1);
          this.loadAuditLogs();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  loadAuditLogs(): void {
    this.loading.set(true);
    this.error.set(null);

    const { actorId, action, targetType } = this.filterForm.getRawValue();
    this.hasActiveFilters.set(!!(actorId || action || targetType));
    const params = {
      page: this.page(),
      limit: this.limit(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      ...(Number(actorId) > 0 ? { actorId: Number(actorId) } : {}),
      ...(action ? { action } : {}),
      ...(targetType ? { targetType } : {}),
    };

    this.#auditApi
      .getAuditLogs(params)
      .pipe(
        tap((res) => {
          this.auditLogs.set(res.data);
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

  onPageChange(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    this.limit.set(event.pageSize);
    this.loadAuditLogs();
  }

  onSortChange(sort: Sort): void {
    this.sortBy.set(sort.active || 'createdAt');
    this.sortOrder.set((sort.direction as 'asc' | 'desc') || 'desc');
    this.page.set(1);
    this.loadAuditLogs();
  }

  clearActorId(): void {
    this.filterForm.controls['actorId'].setValue('', { emitEvent: false });
    this.page.set(1);
    this.loadAuditLogs();
  }

  resetFilters(): void {
    this.filterForm.reset({ actorId: '', action: '', targetType: '' }, { emitEvent: false });
    this.page.set(1);
    this.loadAuditLogs();
  }
}
