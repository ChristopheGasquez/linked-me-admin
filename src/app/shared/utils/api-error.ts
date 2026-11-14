import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../models/api-response.model';

export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)} min`;
}

// Turns an HTTP error into a translatable API error (`api.<code>`), retry delay formatted for display
export function toApiError(err: HttpErrorResponse): {
  code: string;
  params?: Record<string, unknown>;
} {
  const apiError = err.error as ApiError | null;
  const params = apiError?.params as Record<string, unknown> | undefined;
  return {
    code: apiError?.code ?? (err.status === 403 ? 'forbidden' : 'unknown'),
    params:
      typeof params?.['retryAfter'] === 'number'
        ? { ...params, retryAfter: formatRetryAfter(params['retryAfter']) }
        : params,
  };
}
