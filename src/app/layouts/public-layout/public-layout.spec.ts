import { TestBed } from '@angular/core/testing';

import pkg from '../../../../package.json';
import { fr, provideTestDefaults } from '../../../testing/test-providers';
import { PublicLayout } from './public-layout';

describe('PublicLayout', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    const fixture = TestBed.createComponent(PublicLayout);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => localStorage.clear());

  it('links to the login and register pages', async () => {
    const links = Array.from((await render()).querySelectorAll('nav a')).map((a) => [
      a.textContent!.trim(),
      a.getAttribute('href'),
    ]);

    expect(links).toEqual([
      [fr.layout.public.nav.login, '/auth/login'],
      [fr.layout.public.nav.register, '/auth/register'],
    ]);
  });

  it('shows the app version', async () => {
    expect((await render()).querySelector('footer')!.textContent!.trim()).toBe(`v${pkg.version}`);
  });
});
