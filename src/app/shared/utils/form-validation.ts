import { FormGroup } from '@angular/forms';
import { ApiError } from '../models/api-response.model';

export function applyValidationErrors(form: FormGroup, apiError: ApiError): void {
  apiError.params?.fields?.forEach(({ key, code }) => {
    form.controls[key]?.setErrors({ serverError: code });
  });
}
