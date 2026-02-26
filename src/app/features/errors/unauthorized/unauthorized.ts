import { Component } from '@angular/core';
import { InfoCard, InfoCardAction } from '../../../shared/components/info-card/info-card';

@Component({
  selector: 'app-unauthorized',
  imports: [InfoCard],
  styles: [':host { display: contents; }'],
  template: `
    <app-info-card
      titleKey="errors.unauthorized.title"
      descriptionKey="errors.unauthorized.description"
      [actions]="actions" />
  `,
})
export class Unauthorized {
  readonly actions: InfoCardAction[] = [
    { type: 'link', labelKey: 'errors.unauthorized.loginLink', routerLink: ['/', 'auth', 'login'] },
  ];
}
