import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-dashboard',
  imports: [TranslocoDirective, EmptyState],
  styleUrl: './dashboard.scss',
  template: `
    <ng-container *transloco="let t">
      <div class="dashboard">
        <h1 class="dashboard__title">{{ t('common.title.dashboard') }}</h1>
        <app-empty-state
          icon="apps"
          titleKey="dashboard.empty.title"
          hintKey="dashboard.empty.hint" />
      </div>
    </ng-container>
  `,
})
export class Dashboard {}
