import { Component, computed, inject, input, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-uuid',
  imports: [RouterLink, MatIconButton, MatIcon, MatTooltip, TranslocoDirective],
  templateUrl: './uuid.html',
  styleUrl: './uuid.scss',
})
export class Uuid {
  #clipboard = inject(Clipboard);
  #announcer = inject(LiveAnnouncer);
  #transloco = inject(TranslocoService);

  readonly value = input.required<string>();
  readonly link = input<string | unknown[]>();

  copied = signal(false);

  // UUID v7 starts with a timestamp: the random tail is what tells ids apart
  readonly short = computed(() => '…' + this.value().slice(-8));

  copy(): void {
    this.#clipboard.copy(this.value());
    this.copied.set(true);
    this.#announcer.announce(this.#transloco.translate('common.uuid.copied'));
    setTimeout(() => this.copied.set(false), 2000);
  }
}
