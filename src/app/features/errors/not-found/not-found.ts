import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { InfoCard, InfoCardAction } from '../../../shared/components/info-card/info-card';

@Component({
  selector: 'app-not-found',
  imports: [InfoCard],
  styles: [':host { display: contents; }'],
  template: `
    <app-info-card
      titleKey="errors.notFound.title"
      descriptionKey="errors.notFound.description"
      [actions]="actions()" />
  `,
})
export class NotFound {
  #authService = inject(AuthService);

  actions = computed<InfoCardAction[]>(() => [
    this.#authService.isAuthenticated()
      ? { type: 'link', labelKey: 'errors.notFound.dashboardLink', routerLink: ['/', 'dashboard'] }
      : { type: 'link', labelKey: 'errors.notFound.loginLink', routerLink: ['/', 'auth', 'login'] },
  ]);
}
