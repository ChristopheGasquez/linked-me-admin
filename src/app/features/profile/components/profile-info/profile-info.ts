import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, finalize, startWith, tap } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { ApiError } from '../../../../shared/models/api-response.model';
import { applyValidationErrors } from '../../../../shared/utils/form-validation';

@Component({
  selector: 'app-profile-info',
  templateUrl: './profile-info.html',
  styleUrl: './profile-info.scss',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    MatButton,
    MatIconButton,
    MatIcon,
    MatSuffix,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
  ],
})
export class ProfileInfo {
  #authService = inject(AuthService);
  #profileService = inject(ProfileService);
  #fb = inject(FormBuilder);

  nameEditing = signal(false);
  loading = signal(false);
  nameSuccess = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  infoForm: FormGroup = this.#fb.group({
    name: [
      { value: this.#authService.currentUser()?.name ?? '', disabled: true },
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
  });

  private formValue = toSignal(
    this.infoForm.valueChanges.pipe(startWith(this.infoForm.getRawValue())),
  );

  canSave = computed(() => {
    this.formValue();
    if (!this.nameEditing()) return false;
    const ctrl = this.infoForm.controls['name'];
    return ctrl.valid && ctrl.value !== this.#authService.currentUser()?.name;
  });

  enable(): void {
    this.nameEditing.set(true);
    this.infoForm.controls['name'].enable();
    this.nameSuccess.set(false);
    this.error.set(null);
  }

  cancel(): void {
    this.nameEditing.set(false);
    this.infoForm.controls['name'].setValue(this.#authService.currentUser()?.name ?? '');
    this.infoForm.controls['name'].disable();
    this.error.set(null);
    this.nameSuccess.set(false);
  }

  onSubmit(): void {
    if (!this.canSave()) return;
    this.error.set(null);
    this.loading.set(true);
    const { name } = this.infoForm.getRawValue();
    this.#profileService
      .updateProfile(name)
      .pipe(
        tap((profile) => {
          this.infoForm.controls['name'].setValue(profile.name);
          this.infoForm.controls['name'].disable();
          this.nameEditing.set(false);
          this.nameSuccess.set(true);
        }),
        catchError((err: HttpErrorResponse) => {
          const apiError = err.error as ApiError;
          if (apiError?.code === 'validation.failed') {
            applyValidationErrors(this.infoForm, apiError);
          } else {
            this.error.set({
              code: apiError?.code ?? 'unknown',
              params: apiError?.params as Record<string, unknown>,
            });
          }
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }
}
