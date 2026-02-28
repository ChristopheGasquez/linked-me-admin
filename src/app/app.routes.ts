import { Routes } from '@angular/router';

import { hasPermissionGuard } from './core/guards/has-permission.guard';
import { isAuthenticatedGuard } from './core/guards/is-authenticated.guard';
import { PrivateLayout } from './layouts/private-layout/private-layout';
import { PublicLayout } from './layouts/public-layout/public-layout';

export const routes: Routes = [
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },
  {
    path: 'auth',
    component: PublicLayout,
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'admin',
    component: PrivateLayout,
    canActivate: [isAuthenticatedGuard],
    loadChildren: () => import('./features/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: 'profile',
    component: PrivateLayout,
    canActivate: [isAuthenticatedGuard, hasPermissionGuard('realm:profile')],
    loadChildren: () => import('./features/profile/profile.routes').then((m) => m.profileRoutes),
  },
  {
    path: '401',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/errors/unauthorized/unauthorized').then((m) => m.Unauthorized),
      },
    ],
  },
  {
    path: '403',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/errors/forbidden/forbidden').then((m) => m.Forbidden),
      },
    ],
  },
  {
    path: 'wip',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/errors/work-in-progress/work-in-progress').then(
            (m) => m.WorkInProgress,
          ),
      },
    ],
  },
  {
    path: '**',
    component: PublicLayout,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/errors/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
