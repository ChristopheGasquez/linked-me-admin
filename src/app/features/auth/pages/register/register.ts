import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ApiError } from '../../../../shared/models/api-response.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatError, MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { EMPTY } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { applyValidationErrors } from '../../../../shared/utils/form-validation';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrl: './register.scss',
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatCardHeader,
    MatCardActions,
    MatButton,
    MatIcon,
    MatIconButton,
    MatSuffix,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatCardSubtitle,
    RouterLink,
    TranslocoDirective,
  ],
})
export class Register {
  #formBuilder: FormBuilder = inject(FormBuilder);
  #authService = inject(AuthService);

  showPassword = signal(false);
  loading = signal(false);
  error = signal<{ code: string; params?: Record<string, unknown> } | null>(null);

  form: FormGroup = this.#formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;

    const { name, email, password } = this.form.getRawValue();
    this.error.set(null);
    this.loading.set(true);
    this.#authService
      .register(name, email, password)
      .pipe(
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
