import { ActivatedRoute } from '@angular/router';

export interface BreadcrumbItem {
  labelKey: string;
  url: string;
}

// routeConfig.data (not snapshot.data) to avoid inherited data on empty-path routes
export function breadcrumbParents(route: ActivatedRoute): BreadcrumbItem[] {
  return route.snapshot.pathFromRoot.slice(0, -1).flatMap((r) => {
    const labelKey = r.routeConfig?.data?.['breadcrumb'] as string | undefined;
    const url = '/' + r.pathFromRoot.flatMap((p) => p.url.map((segment) => segment.path)).join('/');
    return labelKey ? [{ labelKey, url }] : [];
  });
}
