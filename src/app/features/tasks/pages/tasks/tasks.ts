import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, of } from 'rxjs';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { MatButton } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { TasksApiService } from '../../../../shared/services/tasks-api.service';
import { TaskName } from '../../../../shared/models/task.model';

interface TaskDefinition {
  name: TaskName;
  i18nKey: string;
  permission: string;
  icon: string;
  confirm: boolean;
}

interface TaskResult {
  type: 'success' | 'error';
  key: string;
  params?: Record<string, unknown>;
}

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    MatButton,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatProgressSpinner,
    HasPermissionDirective,
  ],
})
export class Tasks {
  #tasksApi = inject(TasksApiService);
  #dialog = inject(MatDialog);

  readonly tasks: TaskDefinition[] = [
    { name: 'unverified-users', i18nKey: 'unverifiedUsers', permission: 'task:clean-users', icon: 'person_remove', confirm: true },
    { name: 'expired-tokens', i18nKey: 'expiredTokens', permission: 'task:clean-tokens', icon: 'key_off', confirm: false },
    { name: 'audit-logs', i18nKey: 'auditLogs', permission: 'task:clean-audit', icon: 'history', confirm: true },
    { name: 'orphaned-permissions', i18nKey: 'orphanedPermissions', permission: 'task:clean-permissions', icon: 'link_off', confirm: true },
  ];

  running = signal<Partial<Record<TaskName, boolean>>>({});
  results = signal<Partial<Record<TaskName, TaskResult>>>({});

  olderThanDays = new FormControl(30, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)],
  });

  run(task: TaskDefinition): void {
    const data: ConfirmDialogData = {
      titleKey: `admin.tasks.items.${task.i18nKey}.title`,
      messageKey: `admin.tasks.items.${task.i18nKey}.confirm`,
      messageParams: { days: this.olderThanDays.value },
      confirmLabelKey: 'admin.tasks.run',
      destructive: true,
    };
    const confirmed$ = task.confirm
      ? this.#dialog.open(ConfirmDialog, { data }).afterClosed().pipe(filter(Boolean))
      : of(true);

    confirmed$
      .pipe(
        tap(() => this.#setState(task.name, true, undefined)),
        switchMap(() =>
          task.name === 'audit-logs'
            ? this.#tasksApi.runCleanup('audit-logs', { olderThanDays: this.olderThanDays.value })
            : this.#tasksApi.runCleanup(task.name),
        ),
        tap((res) =>
          this.#setState(task.name, false, {
            type: 'success',
            key:
              res.code.endsWith('.done') && res.params?.['count'] === 0
                ? 'admin.tasks.nothingToClean'
                : `api.${res.code}`,
            params: res.params,
          }),
        ),
        catchError((err: HttpErrorResponse) => {
          const code = err.error?.code ?? (err.status === 403 ? 'forbidden' : 'unknown');
          this.#setState(task.name, false, { type: 'error', key: `api.${code}`, params: err.error?.params });
          return EMPTY;
        }),
      )
      .subscribe();
  }

  #setState(name: TaskName, running: boolean, result: TaskResult | undefined): void {
    this.running.update((state) => ({ ...state, [name]: running }));
    this.results.update((state) => ({ ...state, [name]: result }));
  }
}
