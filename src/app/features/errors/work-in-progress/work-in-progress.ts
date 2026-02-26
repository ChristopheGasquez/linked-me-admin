import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { InfoCard, InfoCardAction } from '../../../shared/components/info-card/info-card';

@Component({
  selector: 'app-work-in-progress',
  imports: [InfoCard],
  styles: [':host { display: contents; }'],
  template: `
    <app-info-card
      titleKey="errors.workInProgress.title"
      descriptionKey="errors.workInProgress.description"
      [actions]="actions()" />
  `,
})
export class WorkInProgress {
  #authService = inject(AuthService);

  actions = computed<InfoCardAction[]>(() => [
    this.#authService.isAuthenticated()
      ? { type: 'link', labelKey: 'errors.workInProgress.dashboardLink', routerLink: ['/', 'dashboard'] }
      : { type: 'link', labelKey: 'errors.workInProgress.loginLink', routerLink: ['/', 'auth', 'login'] },
  ]);
}
