import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/components/confirm-dialog/confirm-dialog';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  // Logout (manual, expired session, password change) clears the token before navigating: nothing to protect anymore
  if (!component.hasUnsavedChanges() || !inject(AuthService).getAccessToken()) {
    return true;
  }
  const data: ConfirmDialogData = {
    titleKey: 'common.unsavedChanges.title',
    messageKey: 'common.unsavedChanges.message',
    confirmLabelKey: 'common.unsavedChanges.leave',
    destructive: true,
  };
  return inject(MatDialog).open(ConfirmDialog, { data }).afterClosed().pipe(map(Boolean));
};
