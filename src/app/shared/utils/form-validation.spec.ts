import { FormControl, FormGroup } from '@angular/forms';

import { ApiError } from '../models/api-response.model';
import { applyValidationErrors } from './form-validation';

function apiError(params?: ApiError['params']): ApiError {
  return {
    statusCode: 400,
    message: 'Bad Request',
    error: 'Bad Request',
    code: 'validation.failed',
    params,
  };
}

describe('applyValidationErrors', () => {
  let form: FormGroup;

  beforeEach(() => {
    form = new FormGroup({ email: new FormControl('a@b.c'), password: new FormControl('secret') });
  });

  it('sets the server error code on each listed field', () => {
    applyValidationErrors(form, apiError({ fields: [{ key: 'email', code: 'email.taken' }] }));

    expect(form.controls['email'].errors).toEqual({ serverError: 'email.taken' });
    expect(form.controls['password'].errors).toBeNull();
  });

  it('ignores fields unknown to the form', () => {
    applyValidationErrors(form, apiError({ fields: [{ key: 'unknown', code: 'x' }] }));

    expect(form.valid).toBe(true);
  });

  it('does nothing when the error has no fields', () => {
    applyValidationErrors(form, apiError());
    applyValidationErrors(form, apiError({ retryAfter: 30 }));

    expect(form.valid).toBe(true);
  });
});
