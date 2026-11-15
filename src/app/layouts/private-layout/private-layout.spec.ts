import { BreakpointObserver } from '@angular/cdk/layout';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';

import pkg from '../../../../package.json';
import { HasUnsavedChanges } from '../../core/guards/unsaved-changes.guard';
import { AuthService } from '../../core/services/auth.service';
import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { PrivateLayout } from './private-layout';

@Component({ template: '' })
class PageStub {}

@Component({ template: '' })
class DirtyPage implements HasUnsavedChanges {
  dirty = true;
  hasUnsavedChanges = () => this.dirty;
}

describe('PrivateLayout', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;

  const element = () => harness.routeNativeElement!;
  const loader = () => TestbedHarnessEnvironment.loader(harness.fixture);
  const sidenav = () => loader().getHarness(MatSidenavHarness);
  const navLinks = (selector = 'mat-nav-list a') =>
    Array.from(element().querySelectorAll(selector)).map((a) => a.getAttribute('href'));

  async function render({
    desktop = false,
    permissions = [] as string[],
    url = '/dashboard',
  } = {}) {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([
          {
            path: '',
            component: PrivateLayout,
            children: [
              { path: 'dashboard', component: PageStub },
              { path: 'me', component: PageStub },
              { path: 'admin/users', component: PageStub },
              { path: 'dirty', component: DirtyPage },
            ],
          },
          { path: 'auth/login', component: PageStub },
        ]),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: desktop, breakpoints: {} }) },
        },
      ],
    });
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set(testUser(permissions));
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, PrivateLayout);
    await harness.fixture.whenStable();
  }

  function closeTab(): Event {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event;
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => backend.verify());

  it.each([
    [[], ['/dashboard', '/me']],
    [['realm:admin'], ['/dashboard', '/me', '/admin/users', '/admin/roles']],
    [
      ['realm:audit', 'realm:task'],
      ['/dashboard', '/me', '/admin/audit', '/admin/tasks'],
    ],
  ])('shows the menu entries allowed by %j', async (permissions, links) => {
    await render({ permissions });

    expect(navLinks()).toEqual(links);
  });

  it('highlights the entry of the current page', async () => {
    await render({ permissions: ['realm:admin'], url: '/admin/users' });

    expect(navLinks('mat-nav-list a.active')).toEqual(['/admin/users']);
  });

  it('keeps the menu open beside the page on desktop, even after navigating', async () => {
    await render({ desktop: true });

    expect(await (await sidenav()).getMode()).toBe('side');
    expect(await (await sidenav()).isOpen()).toBe(true);

    await harness.navigateByUrl('/me');
    await harness.fixture.whenStable();

    expect(await (await sidenav()).isOpen()).toBe(true);
  });

  it('opens the menu over the page on mobile and closes it after navigating', async () => {
    await render();
    expect(await (await sidenav()).getMode()).toBe('over');
    expect(await (await sidenav()).isOpen()).toBe(false);

    await (await loader().getHarness(MatButtonHarness.with({ text: 'menu' }))).click();
    expect(await (await sidenav()).isOpen()).toBe(true);

    await harness.navigateByUrl('/me');
    await harness.fixture.whenStable();

    expect(await (await sidenav()).isOpen()).toBe(false);
  });

  it('logs out: revokes the session, clears the tokens and goes to login', async () => {
    await render();
    localStorage.setItem('refresh_token', 'refresh-1');

    await (await loader().getHarness(MatButtonHarness.with({ text: 'logout' }))).click();

    const request = backend.expectOne('/auth/logout');
    expect(request.request.body).toEqual({ refresh_token: 'refresh-1' });
    request.flush({ code: 'auth.logout.success' });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/auth/login'));
  });

  it.each([
    ['a page with unsaved changes', '/dirty', true],
    ['a page without such check', '/dashboard', false],
  ])('on tab close, warns only for %s', async (_, url, warned) => {
    await render({ url });

    expect(closeTab().defaultPrevented).toBe(warned);
  });

  it('does not warn once the changes are saved', async () => {
    await render({ url: '/dirty' });
    const page = harness.fixture.debugElement.query(By.directive(DirtyPage))
      .componentInstance as DirtyPage;
    page.dirty = false;

    expect(closeTab().defaultPrevented).toBe(false);
  });

  it('shows the app version', async () => {
    await render();

    expect(element().querySelector('footer')!.textContent!.trim()).toBe(`v${pkg.version}`);
  });
});
