import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { of, Subject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

const APP_NAME = 'LinkedMe Admin';

// Tab title = translated route `title` key + app name, updated on language change
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  #title = inject(Title);
  #transloco = inject(TranslocoService);
  #key$ = new Subject<string | undefined>();

  constructor() {
    super();
    this.#key$
      .pipe(
        switchMap((key) => (key ? this.#transloco.selectTranslate(key) : of(null))),
        tap((label) => this.#title.setTitle(label ? `${label} — ${APP_NAME}` : APP_NAME)),
      )
      .subscribe();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.#key$.next(this.buildTitle(snapshot));
  }
}
