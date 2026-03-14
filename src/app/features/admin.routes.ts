import { Routes } from '@angular/router';

import { hasPermissionGuard } from '../core/guards/has-permission.guard';

export const adminRoutes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  {
    path: 'users',
    canActivate: [hasPermissionGuard('realm:admin')],
    loadChildren: () => import('./users/users.routes').then((m) => m.usersRoutes),
  },
  {
    path: 'roles',
    canActivate: [hasPermissionGuard('realm:admin')],
    loadChildren: () => import('./roles/roles.routes').then((m) => m.rolesRoutes),
  },
  {
    path: 'audit',
    canActivate: [hasPermissionGuard('realm:audit')],
    loadChildren: () => import('./audit/audit.routes').then((m) => m.auditRoutes),
  },
  {
    path: 'tasks',
    canActivate: [hasPermissionGuard('realm:task')],
    loadChildren: () => import('./tasks/tasks.routes').then((m) => m.tasksRoutes),
  },
];
