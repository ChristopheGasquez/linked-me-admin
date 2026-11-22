import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import pkg from '../../../../package.json';
import { fr, provideTestDefaults } from '../../../testing/test-providers';
import { PublicLayout } from './public-layout';

@Component({ template: '' })
class PageStub {}

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

  it('highlights the link of the current page only', async () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([
          {
            path: 'auth',
            component: PublicLayout,
            children: [
              { path: 'login', component: PageStub },
              { path: 'register', component: PageStub },
            ],
          },
        ]),
      ],
    });
    const harness = await RouterTestingHarness.create('/auth/register');

    const links = Array.from(
      (harness.fixture.nativeElement as HTMLElement).querySelectorAll('nav a'),
    ).map((a) => [a.classList.contains('active'), a.getAttribute('aria-current')]);

    expect(links).toEqual([
      [false, null],
      [true, 'page'],
    ]);
  });

  it('shows the app version', async () => {
    expect((await render()).querySelector('footer')!.textContent!.trim()).toBe(`v${pkg.version}`);
  });
});
