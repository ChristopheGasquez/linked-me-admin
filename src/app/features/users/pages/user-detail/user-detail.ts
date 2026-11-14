import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Observable } from 'rxjs';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../../core/services/auth.service';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { Breadcrumb } from '../../../../shared/components/breadcrumb/breadcrumb';
import { ConfirmDialog, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { HasPermissionDirective } from '../../../../shared/directives/has-permission.directive';
import { UsersApiService } from '../../../../shared/services/users-api.service';
import { RolesApiService } from '../../../../shared/services/roles-api.service';
import { ApiMessage } from '../../../../shared/models/api-response.model';
import { RoleBasicResponse } from '../../../../shared/models/role.model';
import { UrlService } from '../../../../core/services/url.service';
import { toApiError } from '../../../../shared/utils/api-error';
import { breadcrumbParents } from '../../../../shared/utils/breadcrumb';

@Component({
  selector: 'app-user-detail',
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
  imports: [
    TranslocoDirective,
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButton,
    MatIconButton,
    MatChipsModule,
    MatFormFieldModule,
    MatIcon,
    MatInputModule,
    MatProgressBar,
    MatSelectModule,
    MatTooltipModule,
    HasPermissionDirective,
    Breadcrumb,
  ],
})
export class UserDetail implements HasUnsavedChanges {
  #usersApi = inject(UsersApiService);
  #rolesApi = inject(RolesApiService);
  #authService = inject(AuthService);
  #dialog = inject(MatDialog);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #urlService = inject(UrlService);

  readonly backUrl = breadcrumbParents(this.#route).at(-1)?.url ?? '/';
  readonly backLink = this.#urlService.listLink(this.backUrl);

  id = input.required({ transform: numberAttribute });

  acting = signal(false);
  actionError = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  actionSuccess = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  roleToAssign = new FormControl('', { nonNullable: true });

  readonly userResource = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.#usersApi.getUserById(params),
  });

  readonly #rolesResource = rxResource({
    stream: () => this.#rolesApi.getRoles({ limit: 100, sortBy: 'name', sortOrder: 'asc' }),
  });

  readonly user = computed(() => (this.userResource.hasValue() ? this.userResource.value() : undefined));
  readonly loadError = computed(() => {
    const err = this.userResource.error() as HttpErrorResponse | undefined;
    return err ? toApiError(err) : null;
  });
  readonly isSelf = computed(() => this.user()?.id === this.#authService.currentUser()?.id);
  readonly isLocked = computed(() => {
    const until = this.user()?.lockedUntil;
    return !!until && new Date(until) > new Date();
  });
  readonly assignableRoles = computed(() => {
    const owned = new Set(this.user()?.roles.map((role) => role.id));
    const roles = this.#rolesResource.hasValue() ? this.#rolesResource.value().data : [];
    return roles.filter((role) => !owned.has(role.id));
  });

  hasUnsavedChanges(): boolean {
    return !this.acting() && !!this.roleToAssign.value;
  }

  assignRole(): void {
    const role = this.roleToAssign.value;
    if (!role) {
      return;
    }
    this.#mutate(this.#usersApi.assignRole(this.id(), role), (res) => {
      this.actionSuccess.set({ code: res.code, params: res.params });
      this.roleToAssign.reset();
      this.userResource.reload();
    }).subscribe();
  }

  removeRole(role: RoleBasicResponse): void {
    this.#confirm({
      titleKey: 'admin.users.detail.removeRole.title',
      messageKey: `admin.users.detail.removeRole.${this.isSelf() ? 'confirmSelf' : 'confirm'}`,
      messageParams: { role: role.name },
      destructive: true,
    })
      .pipe(
        switchMap(() =>
          this.#mutate(this.#usersApi.removeRole(this.id(), role.id), (res) => {
            this.actionSuccess.set({ code: res.code, params: res.params });
            this.userResource.reload();
          }),
        ),
      )
      .subscribe();
  }

  deleteUser(): void {
    this.#confirm({
      titleKey: 'admin.users.detail.delete.title',
      messageKey: `admin.users.detail.delete.${this.isSelf() ? 'confirmSelf' : 'confirm'}`,
      messageParams: { name: this.user()?.name },
      confirmLabelKey: 'admin.users.detail.delete.button',
      destructive: true,
    })
      .pipe(
        switchMap(() =>
          this.#mutate(this.#usersApi.deleteUser(this.id()), () => this.#router.navigateByUrl(this.backLink)),
        ),
      )
      .subscribe();
  }

  #confirm(data: ConfirmDialogData): Observable<boolean> {
    return this.#dialog.open(ConfirmDialog, { data }).afterClosed().pipe(filter(Boolean));
  }

  #mutate(request$: Observable<ApiMessage>, onSuccess: (res: ApiMessage) => void): Observable<ApiMessage> {
    this.acting.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    return request$.pipe(
      tap((res) => {
        this.acting.set(false);
        onSuccess(res);
      }),
      catchError((err: HttpErrorResponse) => {
        this.acting.set(false);
        this.actionError.set(toApiError(err));
        return EMPTY;
      }),
    );
  }
}
