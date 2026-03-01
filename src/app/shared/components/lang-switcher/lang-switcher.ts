import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { AVAILABLE_LANGS } from '../../models/lang.model';

@Component({
  selector: 'app-lang-switcher',
  imports: [MatIconButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger, MatTooltip, TranslocoPipe],
  template: `
    <button
      mat-icon-button
      [matMenuTriggerFor]="langMenu"
      [matTooltip]="'layout.common.actions.lang' | transloco"
      [matTooltipShowDelay]="500">
      <mat-icon>language</mat-icon>
    </button>
    <mat-menu #langMenu>
      @for (lang of langs; track lang) {
        <button
          mat-menu-item
          (click)="setLang(lang)">
          <mat-icon>{{ activeLang() === lang ? 'check' : '' }}</mat-icon>
          {{ 'common.langs.' + lang | transloco }}
        </button>
      }
    </mat-menu>
  `,
})
export class LangSwitcher {
  #transloco = inject(TranslocoService);

  langs = AVAILABLE_LANGS;
  activeLang = toSignal(this.#transloco.langChanges$, {
    initialValue: this.#transloco.getActiveLang(),
  });

  setLang(lang: string): void {
    this.#transloco.setActiveLang(lang);
  }
}
