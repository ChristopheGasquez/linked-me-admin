import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { TranslocoPipe } from '@jsverse/transloco';

import { LangSwitcher } from '../../shared/components/lang-switcher/lang-switcher';
import { SkipLink } from '../../shared/components/skip-link/skip-link';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import pkg from '../../../../package.json';

@Component({
  selector: 'app-public-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatButton,
    ThemeToggle,
    LangSwitcher,
    TranslocoPipe,
    SkipLink,
  ],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  version = pkg.version;
}
