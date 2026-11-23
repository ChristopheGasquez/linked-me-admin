import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-skip-link',
  imports: [TranslocoPipe],
  template: `
    <button
      type="button"
      class="skip-link"
      (click)="target().focus()">
      {{ 'common.skipLink' | transloco }}
    </button>
  `,
  styleUrl: './skip-link.scss',
})
export class SkipLink {
  target = input.required<HTMLElement>();
}
