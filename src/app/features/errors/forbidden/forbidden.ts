import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { InfoCard, InfoCardAction } from '../../../shared/components/info-card/info-card';

@Component({
  selector: 'app-forbidden',
  imports: [InfoCard],
  styles: [':host { display: contents; }'],
  template: `
    <app-info-card
      titleKey="errors.forbidden.title"
      descriptionKey="errors.forbidden.description"
      [actions]="actions()" />
  `,
})
export class Forbidden {
  #authService = inject(AuthService);

  actions = computed<InfoCardAction[]>(() => [
    this.#authService.isAuthenticated()
      ? { type: 'link', labelKey: 'errors.forbidden.dashboardLink', routerLink: ['/', 'dashboard'] }
      : { type: 'link', labelKey: 'errors.forbidden.loginLink', routerLink: ['/', 'auth', 'login'] },
  ]);
}
