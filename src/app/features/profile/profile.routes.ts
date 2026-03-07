import { Routes } from '@angular/router';

export const profileRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile) },
  { path: 'password', loadComponent: () => import('./pages/change-password/change-password').then((m) => m.ChangePassword) },
];
