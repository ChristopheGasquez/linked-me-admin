import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const usersRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/users-list/users-list').then((m) => m.UsersList) },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/user-detail/user-detail').then((m) => m.UserDetail),
  },
];
