import { Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-empty-state',
  imports: [MatButton, MatIcon, TranslocoDirective],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  icon = input.required<string>();
  titleKey = input.required<string>();
  hintKey = input<string>();
  actionLabelKey = input<string>();

  action = output<void>();
}
