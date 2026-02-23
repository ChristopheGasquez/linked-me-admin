import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard) },
  { path: 'users', loadChildren: () => import('./users/users.routes').then((m) => m.usersRoutes) },
  { path: 'roles', loadChildren: () => import('./roles/roles.routes').then((m) => m.rolesRoutes) },
  { path: 'audit', loadChildren: () => import('./audit/audit.routes').then((m) => m.auditRoutes) },
  { path: 'tasks', loadChildren: () => import('./tasks/tasks.routes').then((m) => m.tasksRoutes) },
];
