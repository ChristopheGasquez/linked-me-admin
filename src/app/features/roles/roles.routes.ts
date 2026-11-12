import { Routes } from '@angular/router';

export const rolesRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/roles-list/roles-list').then((m) => m.RolesList) },
  {
    path: 'new',
    data: { breadcrumb: 'admin.roles.create' },
    loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail),
  },
  { path: ':id', loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail) },
];
