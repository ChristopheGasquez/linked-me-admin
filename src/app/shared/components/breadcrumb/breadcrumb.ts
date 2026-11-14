import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

import { UrlService } from '../../../core/services/url.service';
import { breadcrumbParents } from '../../utils/breadcrumb';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, TranslocoDirective],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss',
})
export class Breadcrumb {
  #route = inject(ActivatedRoute);
  #urlService = inject(UrlService);

  // Current page label (dynamic data); falls back to the route's breadcrumb key
  label = input<string>();

  readonly parents = breadcrumbParents(this.#route).map((item) => ({
    ...item,
    link: this.#urlService.listLink(item.url),
  }));
  readonly currentKey = this.#route.snapshot.routeConfig?.data?.['breadcrumb'] as string | undefined;
}
