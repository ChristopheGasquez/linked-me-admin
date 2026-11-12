import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { TranslocoDirective } from '@jsverse/transloco';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  messageParams?: Record<string, unknown>;
  confirmLabelKey?: string;
  destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styles: '.confirm-dialog__message { white-space: pre-line; }',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton, TranslocoDirective],
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
