import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';

import { provideTestDefaults, testUser } from '../testing/test-providers';
import { routes } from './app.routes';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { AuthService } from './core/services/auth.service';
import { auditRoutes } from './features/audit/audit.routes';
import { profileRoutes } from './features/profile/profile.routes';
import { rolesRoutes } from './features/roles/roles.routes';
import { usersRoutes } from './features/users/users.routes';

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
});
