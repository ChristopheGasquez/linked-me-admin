import { Routes } from '@angular/router';

import { hasPermissionGuard } from './core/guards/has-permission.guard';
import { isAuthenticatedGuard } from './core/guards/is-authenticated.guard';
import { PrivateLayout } from './layouts/private-layout/private-layout';
import { PublicLayout } from './layouts/public-layout/public-layout';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    component: PublicLayout,
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'dashboard',
    component: PrivateLayout,
    canActivate: [isAuthenticatedGuard],
    children: [
      {
        path: '',
        title: 'common.title.dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
    ],
  },
  {
    path: 'me',
    component: PrivateLayout,
    canActivate: [isAuthenticatedGuard, hasPermissionGuard('realm:profile')],
    loadChildren: () => import('./features/profile/profile.routes').then((m) => m.profileRoutes),
  },
  {
    path: 'admin',
    component: PrivateLayout,
    canActivate: [isAuthenticatedGuard],
    loadChildren: () => import('./features/admin.routes').then((m) => m.adminRoutes),
  },
  {
    path: '401',
    component: PublicLayout,
    children: [
      {
        path: '',
        title: 'common.title.errors.unauthorized',
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
        title: 'common.title.errors.forbidden',
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
        title: 'common.title.errors.workInProgress',
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
        title: 'common.title.errors.notFound',
        loadComponent: () =>
          import('./features/errors/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
