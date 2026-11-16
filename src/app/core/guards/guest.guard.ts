import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () =>
  inject(AuthService).getAccessToken() ? inject(Router).createUrlTree(['/dashboard']) : true;
