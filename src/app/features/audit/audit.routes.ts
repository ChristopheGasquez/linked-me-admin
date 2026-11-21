import { Routes } from '@angular/router';

import { hasPermissionGuard } from '../../core/guards/has-permission.guard';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const auditRoutes: Routes = [
  { path: '', title: 'common.title.admin.audit', loadComponent: () => import('./pages/audit-logs/audit-logs').then((m) => m.AuditLogs) },
  {
    path: 'users/:id',
    title: 'common.title.admin.user',
    canActivate: [hasPermissionGuard('realm:admin')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('../users/pages/user-detail/user-detail').then((m) => m.UserDetail),
  },
  {
    path: 'roles/:id',
    title: 'common.title.admin.role',
    canActivate: [hasPermissionGuard('realm:admin')],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('../roles/pages/role-detail/role-detail').then((m) => m.RoleDetail),
  },
];
