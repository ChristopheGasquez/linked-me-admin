import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

export const hasPermissionGuard = (permissions: string | string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const required = Array.isArray(permissions) ? permissions : [permissions];

    // Runs alongside the parent's isAuthenticatedGuard: both share the same session check
    return authService.checkSession().pipe(
      map((signedIn) => {
        if (!signedIn) {
          return router.createUrlTree(['/auth/login']);
        }
        const permissions = authService.currentUser()!.permissions;
        return required.some((p) => permissions.includes(p)) || router.createUrlTree(['/403']);
      }),
    );
  };
};
