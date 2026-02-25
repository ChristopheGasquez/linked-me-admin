import { Component, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

export type InfoCardAction =
  | { type: 'link';   labelKey: string; routerLink: string[] }
  | { type: 'button'; labelKey: string; cssClass?: string; disabled?: boolean; onClick: () => void };

export interface InfoCardNotification { type: 'success' | 'error'; key: string; params?: Record<string, unknown> }

@Component({
  selector: 'app-info-card',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent, MatCardActions, MatButton, RouterLink, TranslocoDirective],
  templateUrl: './info-card.html',
  styleUrl: './info-card.scss',
})
export class InfoCard {
  titleKey = input.required<string>();
  descriptionKey = input.required<string>();
  notifications = input<InfoCardNotification[]>([]);
  actions = input<InfoCardAction[]>([]);
}
