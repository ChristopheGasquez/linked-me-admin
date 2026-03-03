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
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
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
export class Profile implements OnInit, OnDestroy {
  #authService = inject(AuthService);
  #profileService = inject(ProfileService);
  #destroyRef = inject(DestroyRef);
  #router = inject(Router);
  #fb = inject(FormBuilder);

  nameEditing = signal(false);
  passwordEditing = signal(false);
  loading = signal(false);
  nameSuccess = signal(false);
  passwordSuccess = signal(false);
  infoError = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  securityError = signal<{ code: string; params?: Record<string, unknown> } | null>(null);
  countdown = signal(10);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);

  infoForm: FormGroup = this.#fb.group({
    name: [
      { value: this.#authService.currentUser()?.name ?? '', disabled: true },
      [Validators.required, Validators.minLength(2), Validators.maxLength(100)],
    ],
  });

  securityForm: FormGroup = this.#fb.group({
    currentPassword: [{ value: '', disabled: true }, [Validators.required]],
    newPassword: [{ value: '', disabled: true }, [Validators.required, Validators.minLength(8)]],
    confirmPassword: [{ value: '', disabled: true }, [Validators.required]],
  });

  private infoFormValue = toSignal(
    this.infoForm.valueChanges.pipe(startWith(this.infoForm.getRawValue())),
  );

  private securityFormValue = toSignal(
    this.securityForm.valueChanges.pipe(startWith(this.securityForm.getRawValue())),
  );

  canSaveInfo = computed(() => {
    this.infoFormValue();
    if (!this.nameEditing()) return false;
    const ctrl = this.infoForm.controls['name'];
    return ctrl.valid && ctrl.value !== this.#authService.currentUser()?.name;
  });

  canSavePassword = computed(() => {
    this.securityFormValue();
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

  enableName(): void {
    this.nameEditing.set(true);
    this.infoForm.controls['name'].enable();
    this.nameSuccess.set(false);
    this.infoError.set(null);
  }

  cancelName(): void {
    this.nameEditing.set(false);
    this.infoForm.controls['name'].setValue(this.#authService.currentUser()?.name ?? '');
    this.infoForm.controls['name'].disable();
    this.infoError.set(null);
    this.nameSuccess.set(false);
  }

  cancelPassword(): void {
    this.passwordEditing.set(false);
    this.securityForm.reset();
    this.securityForm.disable();
    this.securityError.set(null);
  }

  enablePassword(): void {
    this.passwordEditing.set(true);
    this.securityForm.controls['currentPassword'].enable();
    this.securityForm.controls['newPassword'].enable();
    this.securityForm.controls['confirmPassword'].enable();
    this.securityError.set(null);
  }

  onSubmitInfo(): void {
    if (!this.canSaveInfo()) return;
    this.infoError.set(null);
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
          this.#handleInfoError(err);
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }

  onSubmitPassword(): void {
    if (!this.canSavePassword()) return;
    this.securityError.set(null);
    this.loading.set(true);
    const { currentPassword, newPassword } = this.securityForm.getRawValue();
    this.#profileService
      .changePassword(currentPassword, newPassword)
      .pipe(
        tap(() => this.#handlePasswordSuccess()),
        catchError((err: HttpErrorResponse) => {
          this.#handleSecurityError(err);
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

  #handlePasswordSuccess(): void {
    this.passwordSuccess.set(true);
    this.#startCountdown();
  }

  #handleInfoError(err: HttpErrorResponse): void {
    const apiError = err.error as ApiError;
    if (apiError?.code === 'validation.failed') {
      applyValidationErrors(this.infoForm, apiError);
    } else {
      this.infoError.set({
        code: apiError?.code ?? 'unknown',
        params: apiError?.params as Record<string, unknown>,
      });
    }
  }

  #handleSecurityError(err: HttpErrorResponse): void {
    const apiError = err.error as ApiError;
    if (apiError?.code === 'validation.failed') {
      applyValidationErrors(this.securityForm, apiError);
    } else {
      this.securityError.set({
        code: apiError?.code ?? 'unknown',
        params: apiError?.params as Record<string, unknown>,
      });
    }
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
