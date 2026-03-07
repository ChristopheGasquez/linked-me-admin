import { Directive, effect, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  @Input({ required: true }) set appHasPermission(permissions: string | string[]) {
    this.#permissions = Array.isArray(permissions) ? permissions : [permissions];
    this.#update();
  }

  #permissions: string[] = [];
  #authService = inject(AuthService);
  #templateRef = inject(TemplateRef);
  #viewContainer = inject(ViewContainerRef);
  #hasView = false;

  constructor() {
    effect(() => {
      this.#authService.currentUser();
      this.#update();
    });
  }

  #update(): void {
    const user = this.#authService.currentUser();
    const hasAccess = !!user && this.#permissions.some((p) => user.permissions.includes(p));

    if (hasAccess && !this.#hasView) {
      this.#viewContainer.createEmbeddedView(this.#templateRef);
      this.#hasView = true;
    } else if (!hasAccess && this.#hasView) {
      this.#viewContainer.clear();
      this.#hasView = false;
    }
  }
}
