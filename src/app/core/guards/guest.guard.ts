import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { ReturnUrlService } from '../services/return-url.service';

export const guestGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const returnUrls = inject(ReturnUrlService);
  return inject(AuthService)
    .checkSession()
    .pipe(
      map((signedIn) => {
        if (!signedIn) {
          return true;
        }
        // Already signed in, sent here by another app: straight back to it, no form
        const returnUrl = returnUrls.resolve(route.queryParamMap.get('returnUrl'));
        if (returnUrl) {
          returnUrls.go(returnUrl);
          return false;
        }
        return router.createUrlTree(['/dashboard']);
      }),
    );
};
