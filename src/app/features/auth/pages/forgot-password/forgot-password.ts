import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { ApiError } from '../../../../shared/models/api-response.model';
import { applyValidationErrors } from '../../../../shared/utils/form-validation';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatCardHeader,
    MatCardActions,
    MatCardSubtitle,
    MatButton,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    RouterLink,
    TranslocoDirective,
  ],
})
export class ForgotPassword {
  #formBuilder = inject(FormBuilder);
  #authService = inject(AuthService);

  loading = signal(false);
  submitted = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  form: FormGroup = this.#formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    const { email } = this.form.getRawValue();
    this.error.set(null);
    this.loading.set(true);
    this.#authService
      .forgotPassword(email)
      .pipe(
        tap(() => this.submitted.set(true)),
        catchError((err: HttpErrorResponse) => {
          const apiError = err.error as ApiError;
          if (apiError?.code === 'validation.failed') {
            applyValidationErrors(this.form, apiError);
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
