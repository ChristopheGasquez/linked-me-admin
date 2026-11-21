import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

const APP_NAME = 'LinkedMe Admin';

// Tab title = [subject —] translated route `title` key — app name, updated on language change
@Injectable({ providedIn: 'root' })
export class TranslatedTitleStrategy extends TitleStrategy {
  #title = inject(Title);
  #transloco = inject(TranslocoService);
  #key$ = new Subject<string | undefined>();
  #subject$ = new BehaviorSubject<string | null>(null);

  constructor() {
    super();
    combineLatest([
      this.#key$.pipe(switchMap((key) => (key ? this.#transloco.selectTranslate(key) : of(null)))),
      this.#subject$,
    ])
      .pipe(
        map(([label, subject]) => [subject, label, APP_NAME].filter(Boolean).join(' — ')),
        tap((title) => this.#title.setTitle(title)),
      )
      .subscribe();
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.#key$.next(this.buildTitle(snapshot));
  }

  // What the page is about (record name, code…): set once loaded, cleared when the page is destroyed
  setSubject(subject: string | null): void {
    this.#subject$.next(subject);
  }
}
