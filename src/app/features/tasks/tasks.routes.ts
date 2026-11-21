import { Routes } from '@angular/router';

export const tasksRoutes: Routes = [
  { path: '', title: 'common.title.admin.tasks', loadComponent: () => import('./pages/tasks/tasks').then((m) => m.Tasks) },
];
