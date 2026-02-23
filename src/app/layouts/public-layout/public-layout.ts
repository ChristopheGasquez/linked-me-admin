import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatToolbar } from '@angular/material/toolbar';
import { TranslocoPipe } from '@jsverse/transloco';

import { LangSwitcher } from '../../shared/components/lang-switcher/lang-switcher';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import pkg from '../../../../package.json';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, MatToolbar, MatButton, ThemeToggle, LangSwitcher, TranslocoPipe],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.scss',
})
export class PublicLayout {
  version = pkg.version;
}
