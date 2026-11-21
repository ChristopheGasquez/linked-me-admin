import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const rolesRoutes: Routes = [
  {
    path: '',
    title: 'common.title.admin.roles',
    loadComponent: () => import('./pages/roles-list/roles-list').then((m) => m.RolesList),
  },
  {
    path: 'new',
    title: 'common.title.admin.roleCreate',
    data: { breadcrumb: 'admin.roles.create' },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail),
  },
  {
    path: ':id',
    title: 'common.title.admin.role',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail),
  },
];
