import { TestBed } from '@angular/core/testing';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { provideRouter, Route, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import en from '../../public/i18n/en.json';
import { fr, provideTestDefaults, testUser } from '../testing/test-providers';
import { routes } from './app.routes';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { AuthService } from './core/services/auth.service';
import { AuditLogs } from './features/audit/pages/audit-logs/audit-logs';
import { auditRoutes } from './features/audit/audit.routes';
import { profileRoutes } from './features/profile/profile.routes';
import { RolesList } from './features/roles/pages/roles-list/roles-list';
import { rolesRoutes } from './features/roles/roles.routes';
import { UsersList } from './features/users/pages/users-list/users-list';
import { usersRoutes } from './features/users/users.routes';

// Every route rendering a page (component or loadComponent, no children), lazy routes included
async function pageRoutes(routes: Routes, parent = ''): Promise<{ path: string; route: Route }[]> {
  const pages: { path: string; route: Route }[] = [];
  for (const route of routes) {
    const path = `${parent}/${route.path ?? ''}`;
    const children =
      route.children ?? (route.loadChildren ? ((await route.loadChildren()) as Routes) : null);
    if (children) {
      pages.push(...(await pageRoutes(children, path)));
    } else if (route.component || route.loadComponent) {
      pages.push({ path, route });
    }
  }
  return pages;
}

function translation(translations: object, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      translations,
    );
}

describe('App routes', () => {
  let router: Router;

  // Signs in a user holding exactly these permissions
  function signIn(...permissions: string[]) {
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set(testUser(permissions));
  }

  async function landingOf(url: string): Promise<string> {
    await router.navigateByUrl(url);
    return router.url;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...provideTestDefaults(), provideRouter(routes)],
    });
    router = TestBed.inject(Router);
  });

  describe('signed out', () => {
    it.each([
      '/dashboard',
      '/me',
      '/admin/users',
      '/admin/roles/3',
      '/admin/audit',
      '/admin/tasks',
    ])('sends %s to the login page', async (url) =>
      expect(await landingOf(url)).toBe('/auth/login'),
    );

    it.each([
      '/auth/login',
      '/auth/register',
      '/auth/verify-email',
      '/auth/email-confirmed',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/401',
      '/403',
      '/wip',
      '/does-not-exist',
    ])('lets anyone open %s', async (url) => expect(await landingOf(url)).toBe(url));
  });

  describe('signed in', () => {
    it('redirects the root to the dashboard', async () => {
      signIn();
      expect(await landingOf('/')).toBe('/dashboard');
    });

    it('opens the dashboard without any permission', async () => {
      signIn();
      expect(await landingOf('/dashboard')).toBe('/dashboard');
    });

    it('redirects /admin to the users list', async () => {
      signIn('realm:admin');
      expect(await landingOf('/admin')).toBe('/admin/users');
    });

    // [url, permission that opens it]
    it.each([
      ['/me', 'realm:profile'],
      ['/admin/users', 'realm:admin'],
      ['/admin/users/5', 'realm:admin'],
      ['/admin/roles', 'realm:admin'],
      ['/admin/roles/new', 'realm:admin'],
      ['/admin/roles/3', 'realm:admin'],
      ['/admin/audit', 'realm:audit'],
      ['/admin/tasks', 'realm:task'],
    ])('opens %s with %s and refuses it with every other realm', async (url, permission) => {
      const others = ['realm:profile', 'realm:admin', 'realm:audit', 'realm:task'].filter(
        (realm) => realm !== permission,
      );
      signIn(...others);
      expect(await landingOf(url)).toBe('/403');

      signIn(permission);
      expect(await landingOf(url)).toBe(url);
    });

    // Provided by the lazy admin routes, not app.config (keeps the paginator out of the initial bundle)
    it.each([
      ['/admin/users', UsersList],
      ['/admin/roles', RolesList],
      ['/admin/audit', AuditLogs],
    ])('gives %s the translated paginator labels', async (url, page) => {
      signIn('realm:admin', 'realm:audit');
      const harness = await RouterTestingHarness.create(url);

      const intl = harness.fixture.debugElement
        .query(By.directive(page))
        .injector.get(MatPaginatorIntl);

      expect(intl.itemsPerPageLabel).toBe(fr.common.paginator.itemsPerPage);
    });

    it.each(['/auth/login', '/auth/register', '/auth/verify-email', '/auth/forgot-password'])(
      'sends %s to the dashboard',
      async (url) => {
        signIn();
        expect(await landingOf(url)).toBe('/dashboard');
      },
    );

    it.each(['/auth/email-confirmed', '/auth/reset-password'])(
      'still opens %s, reached from an email link',
      async (url) => {
        signIn();
        expect(await landingOf(url)).toBe(url);
      },
    );

    it.each(['/admin/audit/users/5', '/admin/audit/roles/3'])(
      'requires both audit and admin realms for %s',
      async (url) => {
        signIn('realm:audit');
        expect(await landingOf(url)).toBe('/403');

        signIn('realm:admin');
        expect(await landingOf(url)).toBe('/403');

        signIn('realm:audit', 'realm:admin');
        expect(await landingOf(url)).toBe(url);
      },
    );
  });

  describe('unsaved changes', () => {
    const at = (routeList: Routes, path: string) => routeList.find((route) => route.path === path)!;

    it.each([
      ['/me', profileRoutes, ''],
      ['/admin/users/:id', usersRoutes, ':id'],
      ['/admin/roles/new', rolesRoutes, 'new'],
      ['/admin/roles/:id', rolesRoutes, ':id'],
      ['/admin/audit/users/:id', auditRoutes, 'users/:id'],
      ['/admin/audit/roles/:id', auditRoutes, 'roles/:id'],
    ])('asks before leaving %s with unsaved changes', (_, routeList, path) => {
      expect(at(routeList, path).canDeactivate).toContain(unsavedChangesGuard);
    });
  });

  it('gives every page a common.title key translated in French and English', async () => {
    const pages = await pageRoutes(routes);
    expect(pages.length).toBeGreaterThan(20);

    for (const { path, route } of pages) {
      const key = route.title;
      expect(key, `${path} has no title`).toBeTypeOf('string');
      expect(key as string, path).toMatch(/^common\.title\./);
      expect(translation(fr, key as string), `${path}: ${key} missing in fr`).toBeTypeOf('string');
      expect(translation(en, key as string), `${path}: ${key} missing in en`).toBeTypeOf('string');
    }
  });
});
