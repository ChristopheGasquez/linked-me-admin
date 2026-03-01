import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';

import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [MatIconButton, MatIcon, MatTooltip, TranslocoPipe],
  template: `
    <button mat-icon-button
      [matTooltip]="'layout.common.actions.theme' | transloco"
      [matTooltipShowDelay]="500"
      (click)="themeService.toggle()">
      <mat-icon>{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
})
export class ThemeToggle {
  themeService = inject(ThemeService);
}
