import { computed, Directive, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appDisableIfNoPermission]',
})
export class DisableIfNoPermissionDirective {
  #authService = inject(AuthService);
  #el = inject(ElementRef);
  #renderer = inject(Renderer2);

  appDisableIfNoPermission = input.required<string | string[]>();

  #hasAccess = computed(() => {
    const user = this.#authService.currentUser();
    const required = this.appDisableIfNoPermission();
    const permissions = Array.isArray(required) ? required : [required];
    return !!user && permissions.some((p) => user.permissions.includes(p));
  });

  constructor() {
    effect(() => {
      if (this.#hasAccess()) {
        this.#renderer.removeAttribute(this.#el.nativeElement, 'disabled');
        this.#renderer.setStyle(this.#el.nativeElement, 'pointer-events', null);
      } else {
        this.#renderer.setAttribute(this.#el.nativeElement, 'disabled', '');
        this.#renderer.setStyle(this.#el.nativeElement, 'pointer-events', 'none');
      }
    });
  }
}
