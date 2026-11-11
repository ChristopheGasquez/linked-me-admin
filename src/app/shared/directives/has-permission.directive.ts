import { computed, Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasPermission]',
})
export class HasPermissionDirective {
  #authService = inject(AuthService);
  #templateRef = inject(TemplateRef);
  #viewContainer = inject(ViewContainerRef);
  #hasView = false;

  appHasPermission = input.required<string | string[]>();

  #hasAccess = computed(() => {
    const user = this.#authService.currentUser();
    const required = this.appHasPermission();
    const permissions = Array.isArray(required) ? required : [required];
    return !!user && permissions.some((p) => user.permissions.includes(p));
  });

  constructor() {
    effect(() => {
      const hasAccess = this.#hasAccess();
      if (hasAccess && !this.#hasView) {
        this.#viewContainer.createEmbeddedView(this.#templateRef);
        this.#hasView = true;
      } else if (!hasAccess && this.#hasView) {
        this.#viewContainer.clear();
        this.#hasView = false;
      }
    });
  }
}
