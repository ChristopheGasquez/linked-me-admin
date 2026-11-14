import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, UrlTree } from '@angular/router';
import { filter, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UrlService {
  #router = inject(Router);
  #lastListUrl: string | null = null;

  // Call from a main list component's injection context: records its URL until it is destroyed
  trackListUrl(): void {
    this.#router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        tap((event) => (this.#lastListUrl = event.urlAfterRedirects)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  // Restores the last list URL (with query params) when it matches the given path
  listLink(path: string): UrlTree {
    const last = this.#lastListUrl;
    return this.#router.parseUrl(last && last.split('?')[0] === path ? last : path);
  }

  clearListUrl(): void {
    this.#lastListUrl = null;
  }
}
