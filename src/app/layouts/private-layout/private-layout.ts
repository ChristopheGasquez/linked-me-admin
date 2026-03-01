import { Component, inject, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { filter, map, tap } from 'rxjs';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatListItem, MatListItemIcon, MatListItemTitle, MatNavList } from '@angular/material/list';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';

import { LangSwitcher } from '../../shared/components/lang-switcher/lang-switcher';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { AuthService } from '../../core/services/auth.service';
import pkg from '../../../../package.json';

@Component({
  selector: 'app-private-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatNavList,
    MatListItem,
    MatListItemIcon,
    MatListItemTitle,
    TranslocoPipe,
    ThemeToggle,
    LangSwitcher,
  ],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss',
})
export class PrivateLayout {
  @ViewChild(MatSidenav) sidenav!: MatSidenav;

  #authService = inject(AuthService);
  #router = inject(Router);

  readonly isDesktop = toSignal(
    inject(BreakpointObserver).observe('(min-width: 1200px)').pipe(map(r => r.matches)),
    { initialValue: false },
  );

  version = pkg.version;

  constructor() {
    this.#router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      filter(() => !this.isDesktop()),
      tap(() => this.sidenav?.close()),
      takeUntilDestroyed(),
    ).subscribe();
  }

  logout(): void {
    this.#authService.logout();
    this.#router.navigate(['/auth/login']);
  }
}
