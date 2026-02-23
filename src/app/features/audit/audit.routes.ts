import { Routes } from '@angular/router';

export const auditRoutes: Routes = [
  { path: '', loadComponent: () => import('./pages/audit-logs/audit-logs').then((m) => m.AuditLogs) },
];
