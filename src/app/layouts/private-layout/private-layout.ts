import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
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
    MatToolbar,
    MatIconButton,
    MatIcon,
    MatTooltip,
    TranslocoPipe,
    ThemeToggle,
    LangSwitcher,
  ],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss',
})
export class PrivateLayout {
  #authService = inject(AuthService);
  #router = inject(Router);

  version = pkg.version;

  logout(): void {
    this.#authService.logout();
    this.#router.navigate(['/auth/login']);
  }
}
