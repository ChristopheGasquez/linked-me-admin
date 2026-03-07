import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError, finalize, startWith, tap } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
  selector: 'app-profile-security',
  templateUrl: './profile-security.html',
  styleUrl: './profile-security.scss',
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
export class ProfileSecurity implements OnInit, OnDestroy {
  #authService = inject(AuthService);
  #profileService = inject(ProfileService);
  #destroyRef = inject(DestroyRef);
  #router = inject(Router);
  #fb = inject(FormBuilder);

  passwordEditing = signal(false);
  loading = signal(false);
  passwordSuccess = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  countdown = signal(10);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);

  securityForm: FormGroup = this.#fb.group({
    currentPassword: [{ value: '', disabled: true }, [Validators.required]],
    newPassword: [{ value: '', disabled: true }, [Validators.required, Validators.minLength(8)]],
    confirmPassword: [{ value: '', disabled: true }, [Validators.required]],
  });

  private formValue = toSignal(
    this.securityForm.valueChanges.pipe(startWith(this.securityForm.getRawValue())),
  );

  canSave = computed(() => {
    this.formValue();
    if (!this.passwordEditing()) return false;
    const curr = this.securityForm.controls['currentPassword'];
    const newP = this.securityForm.controls['newPassword'];
    const conf = this.securityForm.controls['confirmPassword'];
    if (!curr.value || curr.invalid || newP.invalid || conf.invalid) return false;
    return newP.value === conf.value;
  });

  #interval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.securityForm.controls['newPassword'].valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#validatePasswordMatch());
    this.securityForm.controls['confirmPassword'].valueChanges
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#validatePasswordMatch());
  }

  ngOnDestroy(): void {
    this.#clearInterval();
  }

  enable(): void {
    this.passwordEditing.set(true);
    this.securityForm.controls['currentPassword'].enable();
    this.securityForm.controls['newPassword'].enable();
    this.securityForm.controls['confirmPassword'].enable();
    this.error.set(null);
  }

  cancel(): void {
    this.passwordEditing.set(false);
    this.securityForm.reset();
    this.securityForm.disable();
    this.error.set(null);
  }

  onSubmit(): void {
    if (!this.canSave()) return;
    this.error.set(null);
    this.loading.set(true);
    const { currentPassword, newPassword } = this.securityForm.getRawValue();
    this.#profileService
      .changePassword(currentPassword, newPassword)
      .pipe(
        tap(() => {
          this.passwordSuccess.set(true);
          this.#startCountdown();
        }),
        catchError((err: HttpErrorResponse) => {
          const apiError = err.error as ApiError;
          if (apiError?.code === 'validation.failed') {
            applyValidationErrors(this.securityForm, apiError);
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

  goToLogin(): void {
    this.#clearInterval();
    this.#authService.logout();
    this.#router.navigate(['/', 'auth', 'login']);
  }

  #validatePasswordMatch(): void {
    const newP = this.securityForm.controls['newPassword'].value;
    const conf = this.securityForm.controls['confirmPassword'].value;
    const ctrl = this.securityForm.controls['confirmPassword'];
    if (conf && newP !== conf) {
      ctrl.setErrors({ ...ctrl.errors, mismatch: true });
    } else if (ctrl.hasError('mismatch')) {
      const errors = { ...ctrl.errors };
      delete errors['mismatch'];
      ctrl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  #startCountdown(): void {
    this.#interval = setInterval(() => {
      const n = this.countdown();
      if (n <= 1) {
        this.#clearInterval();
        this.#authService.logout();
        this.#router.navigate(['/', 'auth', 'login']);
      } else {
        this.countdown.set(n - 1);
      }
    }, 1000);
  }

  #clearInterval(): void {
    if (this.#interval !== null) {
      clearInterval(this.#interval);
      this.#interval = null;
    }
  }
}
