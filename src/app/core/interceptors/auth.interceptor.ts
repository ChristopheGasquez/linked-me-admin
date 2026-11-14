import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getAccessToken();
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(error => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (req.url.includes('/auth/refresh')) {
        authService.logout();
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      // Business 401s (wrong credentials, invalid link, wrong current password...) carry a code;
      // only the API's token check answers 401 without code (API convention, covered by an API test)
      if (error.error?.code) {
        return throwError(() => error);
      }

      return authService.refreshTokens().pipe(
        switchMap(newToken => {
          const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
          return next(retryReq);
        }),
        catchError(refreshError => {
          router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
