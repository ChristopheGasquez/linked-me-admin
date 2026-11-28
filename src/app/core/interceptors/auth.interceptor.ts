import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = inject(AppConfigService).apiUrl;
  // Only API requests carry the session cookies (i18n is served by the front)
  if (!req.url.startsWith(apiUrl)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  // Session cookies are HttpOnly: the browser only sends and stores them with credentials
  const apiReq = req.clone({ withCredentials: true });

  return next(apiReq).pipe(
    catchError((error) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        req.url.includes('/auth/refresh')
      ) {
        return throwError(() => error);
      }

      // Business 401s (wrong credentials, invalid link, wrong current password...) carry a code;
      // only the API's token check answers 401 without code (API convention, covered by an API test)
      if (error.error?.code) {
        return throwError(() => error);
      }

      // Session check from a guard (/auth/me while signed out): the guard handles the redirect
      const wasAuthenticated = authService.isAuthenticated();
      return authService.refreshSession().pipe(
        switchMap(() => next(apiReq)),
        catchError((refreshError) => {
          if (wasAuthenticated && !authService.isAuthenticated()) {
            router.navigate(['/auth/login']);
          }
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
