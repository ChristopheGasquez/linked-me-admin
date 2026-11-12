import { Routes } from '@angular/router';

import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const profileRoutes: Routes = [
  {
    path: '',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.Profile),
  },
];
