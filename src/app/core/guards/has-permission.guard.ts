import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const hasPermissionGuard = (permissions: string | string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = authService.currentUser();
    if (!user) {
      return router.createUrlTree(['/auth/login']);
    }

    const required = Array.isArray(permissions) ? permissions : [permissions];
    const hasPermission = required.some((p) => user.permissions.includes(p));

    return hasPermission || router.createUrlTree(['/403']);
  };
};