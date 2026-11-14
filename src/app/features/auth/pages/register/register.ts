import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { EMPTY } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';

import { AuthService } from '../../../../core/services/auth.service';
import { toApiError } from '../../../../shared/utils/api-error';
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
  #router = inject(Router);

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
        tap(() => this.#router.navigate(['/', 'auth', 'verify-email'], { queryParams: { email } })),
        catchError((err: HttpErrorResponse) => {
          if (err.error?.code === 'validation.failed') {
            applyValidationErrors(this.form, err.error);
          } else {
            this.error.set(toApiError(err));
          }
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe();
  }
}
