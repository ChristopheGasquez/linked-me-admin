import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const rolesRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/roles-list/roles-list').then((m) => m.RolesList) },
  {
    path: 'new',
    data: { breadcrumb: 'admin.roles.create' },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail),
  },
  {
    path: ':id',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail),
  },
];
