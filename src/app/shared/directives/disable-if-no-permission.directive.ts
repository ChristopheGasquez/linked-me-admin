import { Directive, effect, ElementRef, inject, Input, Renderer2 } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appDisableIfNoPermission]',
  standalone: true,
})
export class DisableIfNoPermissionDirective {
  @Input({ required: true }) set appDisableIfNoPermission(permissions: string | string[]) {
    this.#permissions = Array.isArray(permissions) ? permissions : [permissions];
    this.#update();
  }

  #permissions: string[] = [];
  #authService = inject(AuthService);
  #el = inject(ElementRef);
  #renderer = inject(Renderer2);

  constructor() {
    effect(() => {
      this.#authService.currentUser();
      this.#update();
    });
  }

  #update(): void {
    const user = this.#authService.currentUser();
    const hasAccess = !!user && this.#permissions.some((p) => user.permissions.includes(p));

    if (hasAccess) {
      this.#renderer.removeAttribute(this.#el.nativeElement, 'disabled');
      this.#renderer.setStyle(this.#el.nativeElement, 'pointer-events', null);
    } else {
      this.#renderer.setAttribute(this.#el.nativeElement, 'disabled', '');
      this.#renderer.setStyle(this.#el.nativeElement, 'pointer-events', 'none');
    }
  }
}
