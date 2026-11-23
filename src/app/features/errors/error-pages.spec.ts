import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { fr, provideTestDefaults } from '../../../testing/test-providers';
import { Forbidden } from './forbidden/forbidden';
import { NotFound } from './not-found/not-found';
import { Unauthorized } from './unauthorized/unauthorized';
import { WorkInProgress } from './work-in-progress/work-in-progress';

describe('Error pages', () => {
  async function render(page: Type<unknown>, authenticated: boolean) {
    if (authenticated) localStorage.setItem('access_token', 'access-1');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    const fixture = TestBed.createComponent(page);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return {
      title: element.querySelector('h1')!.textContent!.trim(),
      description: element.querySelector('mat-card-content')!.textContent!.trim(),
      links: Array.from(element.querySelectorAll('a')).map((a) => [
        a.textContent!.trim(),
        a.getAttribute('href'),
      ]),
    };
  }

  beforeEach(() => localStorage.clear());

  describe.each([
    ['Forbidden', Forbidden, fr.errors.forbidden],
    ['NotFound', NotFound, fr.errors.notFound],
    ['WorkInProgress', WorkInProgress, fr.errors.workInProgress],
  ])('%s', (_, page, texts) => {
    it('offers to go back to the dashboard when logged in', async () => {
      expect(await render(page, true)).toEqual({
        title: texts.title,
        description: texts.description,
        links: [[texts.dashboardLink, '/dashboard']],
      });
    });

    it('offers to log in otherwise', async () => {
      expect((await render(page, false)).links).toEqual([[texts.loginLink, '/auth/login']]);
    });
  });

  it.each([true, false])(
    'Unauthorized always offers to log in (logged in: %s)',
    async (authenticated) => {
      expect(await render(Unauthorized, authenticated)).toEqual({
        title: fr.errors.unauthorized.title,
        description: fr.errors.unauthorized.description,
        links: [[fr.errors.unauthorized.loginLink, '/auth/login']],
      });
    },
  );
});
