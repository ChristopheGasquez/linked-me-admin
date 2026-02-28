import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, first, map } from 'rxjs/operators';

import { MeResponse } from '../../shared/models/me.model';
import { AuthService } from '../services/auth.service';

export const hasPermissionGuard = (permissions: string | string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.getAccessToken()) {
      return router.createUrlTree(['/auth/login']);
    }

    const required = Array.isArray(permissions) ? permissions : [permissions];
    const check = (user: MeResponse) => {
      const hasPermission = required.some((p) => user.permissions.includes(p));
      return hasPermission || router.createUrlTree(['/403']);
    };

    const user = authService.currentUser();
    if (user) return check(user);

    return toObservable(authService.currentUser).pipe(
      filter((u): u is MeResponse => u !== null),
      first(),
      map((u) => check(u)),
    );
  };
};