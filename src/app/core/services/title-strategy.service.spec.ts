import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

import en from '../../../../public/i18n/en.json';
import { fr, provideTestDefaults } from '../../../testing/test-providers';
import { TranslatedTitleStrategy } from './title-strategy.service';

@Component({ template: '' })
class PageStub {}

describe('TranslatedTitleStrategy', () => {
  let router: Router;
  const title = () => TestBed.inject(Title).getTitle();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([
          { path: 'roles', title: 'common.title.admin.roles', component: PageStub },
          { path: 'untitled', component: PageStub },
        ]),
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('shows the translated page title followed by the app name', async () => {
    await router.navigateByUrl('/roles');

    expect(title()).toBe(`${fr.common.title.admin.roles} — LinkedMe Admin`);
  });

  it('translates the title again when the language changes', async () => {
    await router.navigateByUrl('/roles');

    TestBed.inject(TranslocoService).setActiveLang('en');

    expect(title()).toBe(`${en.common.title.admin.roles} — LinkedMe Admin`);
  });

  it('shows only the app name on a page without title', async () => {
    await router.navigateByUrl('/untitled');

    expect(title()).toBe('LinkedMe Admin');
  });

  it('shows the page subject before the page title, in every language', async () => {
    await router.navigateByUrl('/roles');

    TestBed.inject(TranslatedTitleStrategy).setSubject('ADMIN');
    expect(title()).toBe(`ADMIN — ${fr.common.title.admin.roles} — LinkedMe Admin`);

    TestBed.inject(TranslocoService).setActiveLang('en');
    expect(title()).toBe(`ADMIN — ${en.common.title.admin.roles} — LinkedMe Admin`);
  });

  it('goes back to the page title once the subject is cleared', async () => {
    await router.navigateByUrl('/roles');
    const strategy = TestBed.inject(TranslatedTitleStrategy);

    strategy.setSubject('ADMIN');
    strategy.setSubject(null);

    expect(title()).toBe(`${fr.common.title.admin.roles} — LinkedMe Admin`);
  });
});
