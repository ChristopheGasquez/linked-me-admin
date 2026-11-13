import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { breadcrumbParents } from '../../utils/breadcrumb';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, TranslocoDirective],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  #route = inject(ActivatedRoute);

  // Current page label (dynamic data); falls back to the route's breadcrumb key
  label = input<string>();

  readonly parents = breadcrumbParents(this.#route);
  readonly currentKey = this.#route.snapshot.routeConfig?.data?.['breadcrumb'] as string | undefined;
}
