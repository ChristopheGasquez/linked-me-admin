import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { concat, EMPTY, Observable, of } from 'rxjs';
import { catchError, filter, last, map, switchMap, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { PermissionResponse } from '../../../../shared/models/permission.model';

interface ActionError {
  code: string;
  params?: Record<string, unknown>;
}

@Component({
  selector: 'app-role-detail',
  templateUrl: './role-detail.html',
  styleUrl: './role-detail.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButton,
    MatIconButton,
    MatCheckbox,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatProgressBar,
    MatTooltipModule,
    HasPermissionDirective,
  ],
})
export class RoleDetail {
  #rolesApi = inject(RolesApiService);
  #authService = inject(AuthService);
  #dialog = inject(MatDialog);
  #router = inject(Router);

  // undefined on /admin/roles/new (create mode)
  id = input<number | undefined, string | undefined>(undefined, {
    transform: (value) => (value === undefined ? undefined : numberAttribute(value)),
  });

  editing = signal(false);
  saving = signal(false);
  selected = signal<Set<string>>(new Set());
  actionSuccess = signal<string | null>(null);
  // Error passed through navigation state when permissions failed right after creation
  actionError = signal<ActionError | null>(this.#router.currentNavigation()?.extras.state?.['error'] ?? null);
  deleteError = signal<ActionError | null>(null);

  nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(50)],
  });

  readonly isCreate = computed(() => this.id() === undefined);
  readonly canListPermissions = computed(
    () => !!this.#authService.currentUser()?.permissions.includes('admin:permission:read'),
  );

  readonly roleResource = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.#rolesApi.getRoleById(params),
  });

  readonly #permissionsResource = rxResource({
    params: () => (this.canListPermissions() ? true : undefined),
    stream: () => this.#rolesApi.getPermissions({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
  });

  readonly role = computed(() => (this.roleResource.hasValue() ? this.roleResource.value() : undefined));
  readonly loadError = computed(() => {
    const err = this.roleResource.error() as HttpErrorResponse | undefined;
    return err ? { code: err.error?.code ?? 'unknown', params: err.error?.params } : null;
  });

  readonly isEditable = computed(() => this.editing() || this.isCreate());
  readonly allPermissions = computed<PermissionResponse[]>(() =>
    this.#permissionsResource.hasValue() ? this.#permissionsResource.value().data : (this.role()?.permissions ?? []),
  );
  readonly groups = computed(() => {
    const groups = new Map<string, PermissionResponse[]>();
    for (const permission of this.allPermissions()) {
      const realm = permission.name.split(':')[0];
      groups.set(realm, [...(groups.get(realm) ?? []), permission]);
    }
    return [...groups].map(([name, permissions]) => ({ name, permissions }));
  });
  readonly owned = computed(() => new Set(this.role()?.permissions.map((permission) => permission.name)));
  readonly checked = computed(() => (this.isEditable() ? this.selected() : this.owned()));
  readonly changes = computed(() => {
    const selected = this.selected();
    const owned = this.owned();
    return {
      added: [...selected].filter((name) => !owned.has(name)),
      removed: (this.role()?.permissions ?? []).filter((permission) => !selected.has(permission.name)),
    };
  });
  readonly hasChanges = computed(() => this.changes().added.length > 0 || this.changes().removed.length > 0);
  readonly ownsRole = computed(() => !!this.role() && !!this.#authService.currentUser()?.roles.includes(this.role()!.name));
  readonly removesAdminManage = computed(
    () =>
      this.role()?.name === 'ADMIN' &&
      this.changes().removed.some((permission) => permission.name === 'admin:role:manage'),
  );

  toggle(name: string, checked: boolean): void {
    this.selected.update((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }

  startEdit(): void {
    this.selected.set(new Set(this.owned()));
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  save(): void {
    const role = this.role();
    if (!role) {
      return;
    }
    const { added, removed } = this.changes();
    const variant = this.removesAdminManage() ? 'confirmAdminManage' : this.ownsRole() ? 'confirmSelf' : 'confirm';
    const requests: Observable<unknown>[] = [
      ...(added.length ? [this.#rolesApi.addPermissions(role.id, added)] : []),
      ...removed.map((permission) => this.#rolesApi.removePermission(role.id, permission.id)),
    ];

    this.#confirm({
      titleKey: 'admin.roles.detail.save.title',
      messageKey: `admin.roles.detail.save.${variant}`,
      messageParams: {
        added: added.join(', ') || '—',
        removed: removed.map((permission) => permission.name).join(', ') || '—',
      },
      confirmLabelKey: 'admin.roles.detail.save.button',
      destructive: removed.length > 0,
    })
      .pipe(
        tap(() => this.#startAction()),
        switchMap(() => concat(...requests).pipe(last())),
        tap(() => this.actionSuccess.set('admin.roles.detail.save.success')),
        catchError((err: HttpErrorResponse) => {
          this.actionError.set(this.#toError(err));
          return of(null);
        }),
        // Reload in both cases: a partial failure may have applied some changes
        tap(() => this.#endEdit()),
        switchMap(() => (this.ownsRole() ? this.#authService.loadMe() : of(null))),
      )
      .subscribe();
  }

  create(): void {
    this.nameControl.markAsTouched();
    if (this.nameControl.invalid) {
      return;
    }
    const name = this.nameControl.value.trim().toUpperCase();
    const permissions = [...this.selected()];

    this.#confirm({
      titleKey: 'admin.roles.detail.create.title',
      messageKey: 'admin.roles.detail.create.confirm',
      messageParams: { name, count: permissions.length },
      confirmLabelKey: 'admin.roles.detail.create.button',
    })
      .pipe(
        tap(() => this.#startAction()),
        switchMap(() => this.#rolesApi.createRole(name)),
        switchMap((role) => {
          const addPermissions$: Observable<unknown> = permissions.length
            ? this.#rolesApi.addPermissions(role.id, permissions)
            : of(null);
          return addPermissions$.pipe(
            map(() => ({ id: role.id, error: null as ActionError | null })),
            catchError((err: HttpErrorResponse) => of({ id: role.id, error: this.#toError(err) })),
          );
        }),
        tap(({ id, error }) => this.#router.navigate(['/admin/roles', id], { state: { error } })),
        catchError((err: HttpErrorResponse) => {
          this.saving.set(false);
          this.actionError.set(this.#toError(err));
          return EMPTY;
        }),
      )
      .subscribe();
  }

  deleteRole(): void {
    const role = this.role();
    if (!role) {
      return;
    }
    this.#confirm({
      titleKey: 'admin.roles.detail.delete.title',
      messageKey: `admin.roles.detail.delete.${this.ownsRole() ? 'confirmSelf' : 'confirm'}`,
      messageParams: { name: role.name },
      confirmLabelKey: 'admin.roles.detail.delete.button',
      destructive: true,
    })
      .pipe(
        tap(() => {
          this.saving.set(true);
          this.deleteError.set(null);
        }),
        switchMap(() => this.#rolesApi.deleteRole(role.id)),
        tap(() => this.#router.navigate(['/admin/roles'])),
        catchError((err: HttpErrorResponse) => {
          this.saving.set(false);
          this.deleteError.set(this.#toError(err));
          return EMPTY;
        }),
      )
      .subscribe();
  }

  #confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.#dialog.open(ConfirmDialog, { data }).afterClosed().pipe(filter(Boolean));
  }

  #startAction(): void {
    this.saving.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
  }

  #endEdit(): void {
    this.saving.set(false);
    this.editing.set(false);
    this.roleResource.reload();
  }

  #toError(err: HttpErrorResponse): ActionError {
    return { code: err.error?.code ?? (err.status === 403 ? 'forbidden' : 'unknown'), params: err.error?.params };
  }
}
