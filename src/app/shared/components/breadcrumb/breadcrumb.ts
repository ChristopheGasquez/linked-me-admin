import { Component, inject, input } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';

interface BreadcrumbItem {
  labelKey: string;
  url: string;
}

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

  // routeConfig.data (not snapshot.data) to avoid inherited data on empty-path routes
  readonly parents: BreadcrumbItem[] = this.#route.snapshot.pathFromRoot.slice(0, -1).flatMap((route) => {
    const labelKey = route.routeConfig?.data?.['breadcrumb'] as string | undefined;
    const url = '/' + route.pathFromRoot.flatMap((r) => r.url.map((segment) => segment.path)).join('/');
    return labelKey ? [{ labelKey, url }] : [];
  });
  readonly currentKey = this.#route.snapshot.routeConfig?.data?.['breadcrumb'] as string | undefined;
}
