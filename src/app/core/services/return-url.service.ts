import { inject, Injectable } from '@angular/core';

import { AppConfigService } from './app-config.service';

// Sends the user back to another app after sign-in (/auth/login?returnUrl=…):
// only to an origin listed in RETURN_URL_ORIGINS, never an open redirect
@Injectable({ providedIn: 'root' })
export class ReturnUrlService {
  #config = inject(AppConfigService);

  // The URL when its origin exactly matches an allowed one, null otherwise (relative, malformed, javascript:…)
  resolve(returnUrl: string | null | undefined): string | null {
    if (!returnUrl) {
      return null;
    }
    let url: URL;
    try {
      url = new URL(returnUrl);
    } catch {
      return null;
    }
    return this.#config.returnUrlOrigins.includes(url.origin) ? url.href : null;
  }

  // Full page load: the other app is a separate site
  go(url: string): void {
    window.location.assign(url);
  }
}
