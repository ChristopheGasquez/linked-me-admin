import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService)
    .checkSession()
    .pipe(map((signedIn) => (signedIn ? router.createUrlTree(['/dashboard']) : true)));
};
