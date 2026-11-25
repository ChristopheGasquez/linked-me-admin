import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { formatDate } from '@angular/common';
import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatChipHarness } from '@angular/material/chips/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { TranslatedTitleStrategy } from '../../../../core/services/title-strategy.service';
import { RoleBasicResponse } from '../../../../shared/models/role.model';
import { UserAdminResponse } from '../../../../shared/models/user-admin.model';
import { fr, provideTestDefaults, testUser, uuid } from '../../../../../testing/test-providers';
import { UserDetail } from './user-detail';

@Component({ template: '' })
class ListStub {}

const role = (id: number, name: string): RoleBasicResponse => ({
  id: uuid(id),
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});
const ADMIN = role(1, 'ADMIN');
const EDITOR = role(2, 'EDITOR');
const VIEWER = role(3, 'VIEWER');

const target = (overrides: Partial<UserAdminResponse> = {}): UserAdminResponse => ({
  id: uuid(5),
  email: 'jo@test.dev',
  name: 'Jo',
  isEmailChecked: true,
  failedLoginAttempts: 0,
  lockedUntil: null,
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-02T08:00:00.000Z',
  roles: [],
  ...overrides,
});

const ALL_PERMISSIONS = ['realm:admin', 'admin:user:assign-role', 'admin:user:delete'];

describe('UserDetail', () => {
  let harness: RouterTestingHarness;
  let loader: HarnessLoader;
  let backend: HttpTestingController;
  let page: UserDetail;

  const element = () => harness.routeNativeElement!;
  const text = () => element().textContent!;
  const button = (label: string) => loader.getHarnessOrNull(MatButtonHarness.with({ text: label }));
  const deleteButton = () => button(fr.admin.users.detail.delete.button);
  const chips = async () =>
    Promise.all((await loader.getAllHarnesses(MatChipHarness)).map((chip) => chip.getText()));
  const dialog = () => document.querySelector<HTMLElement>('mat-dialog-container');

  function signIn(permissions = ALL_PERMISSIONS, id = uuid(1)) {
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set({ ...testUser(permissions), id });
  }

  // The user resource (re)loads: answer it
  function answerUser(user = target()) {
    TestBed.tick();
    backend.expectOne(`/admin/users/${uuid(5)}`).flush(user);
  }

  async function open(user = target(), url = `/admin/users/${uuid(5)}`) {
    page = await harness.navigateByUrl(url, UserDetail);
    TestBed.tick();
    backend
      .expectOne((request) => request.url === '/admin/roles')
      .flush({
        data: [ADMIN, EDITOR, VIEWER],
        meta: { total: 3, page: 1, limit: 100, totalPages: 1 },
      });
    answerUser(user);
    await harness.fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
  }

  async function answerDialog(confirm: boolean) {
    const [cancel, ok] = Array.from(dialog()!.querySelectorAll('button'));
    (confirm ? ok : cancel).click();
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter(
          [
            {
              path: 'admin/users',
              data: { breadcrumb: 'layout.private.sidenav.users' },
              children: [
                { path: '', component: ListStub },
                { path: ':id', title: 'common.title.admin.user', component: UserDetail },
              ],
            },
            {
              path: 'admin/audit',
              data: { breadcrumb: 'layout.private.sidenav.audit' },
              children: [
                { path: '', component: ListStub },
                { path: 'users/:id', component: UserDetail },
              ],
            },
          ],
          withComponentInputBinding(),
        ),
        { provide: TitleStrategy, useExisting: TranslatedTitleStrategy },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    signIn();
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => backend.verify());

  describe('display', () => {
    it('loads the user and every role sorted by name', async () => {
      page = await harness.navigateByUrl(`/admin/users/${uuid(5)}`, UserDetail);
      TestBed.tick();
      const roles = backend.expectOne((request) => request.url === '/admin/roles');
      expect(['limit', 'sortBy', 'sortOrder'].map((key) => roles.request.params.get(key))).toEqual([
        '100',
        'name',
        'asc',
      ]);
      roles.flush({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } });
      answerUser();
      await harness.fixture.whenStable();
      loader = TestbedHarnessEnvironment.loader(harness.fixture);

      const format = (date: string) => formatDate(date, fr.common.dateTimeFormat, 'en-US');
      const values = await Promise.all(
        (await loader.getAllHarnesses(MatInputHarness)).map((input) => input.getValue()),
      );
      expect(values).toEqual([
        uuid(5),
        fr.admin.users.filterEmailCheckedVerified,
        'Jo',
        'jo@test.dev',
        format(target().createdAt),
        format(target().updatedAt),
        '0',
        fr.admin.users.detail.notLocked,
      ]);
      expect(element().querySelector('.user-detail__header__title')!.textContent).toContain('Jo');
    });

    it('shows the API error when the user cannot be loaded', async () => {
      await harness.navigateByUrl(`/admin/users/${uuid(5)}`, UserDetail);
      TestBed.tick();
      backend
        .expectOne((request) => request.url === '/admin/roles')
        .flush({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } });
      backend
        .expectOne(`/admin/users/${uuid(5)}`)
        .flush({ code: 'admin.user.not_found' }, { status: 404, statusText: 'Error' });
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.user.not_found);
      expect(text()).not.toContain(fr.admin.users.detail.sections.roles);
    });

    it.each([
      ['never locked', null, fr.admin.users.detail.notLocked],
      ['locked in the past', '2020-01-01T00:00:00.000Z', fr.admin.users.detail.notLocked],
    ])('shows a %s user as not locked', async (_, lockedUntil, expected) => {
      await open(target({ lockedUntil }));

      const inputs = await loader.getAllHarnesses(MatInputHarness);
      expect(await inputs.at(-1)!.getValue()).toBe(expected);
    });

    it('shows the end of the lock of a locked user', async () => {
      const lockedUntil = new Date(Date.now() + 3_600_000).toISOString();
      await open(target({ lockedUntil, failedLoginAttempts: 5 }));

      const inputs = await loader.getAllHarnesses(MatInputHarness);
      expect(await inputs.at(-1)!.getValue()).toBe(
        formatDate(lockedUntil, fr.common.dateTimeFormat, 'en-US'),
      );
      expect(await inputs.at(-2)!.getValue()).toBe('5');
    });

    it.each([
      [`/admin/users/${uuid(5)}`, '/admin/users'],
      [`/admin/audit/users/${uuid(5)}`, '/admin/audit'],
    ])('opened from %s, goes back to %s', async (url, back) => {
      await open(target(), url);

      expect(element().querySelector('a')!.getAttribute('href')).toBe(back);
    });
  });

  describe('roles', () => {
    it('offers only the roles the user does not have yet', async () => {
      await open(target({ roles: [ADMIN] }));

      expect(await chips()).toEqual(['ADMIN']);
      const select = await loader.getHarness(MatSelectHarness);
      await select.open();
      const options = await select.getOptions();
      expect(await Promise.all(options.map((option) => option.getText()))).toEqual([
        'EDITOR',
        'VIEWER',
      ]);
    });

    it('says when the user has no role', async () => {
      await open();

      expect(text()).toContain(fr.admin.users.detail.noRoles);
    });

    it('says when every role is already assigned', async () => {
      await open(target({ roles: [ADMIN, EDITOR, VIEWER] }));

      expect(text()).toContain(fr.admin.users.detail.allRolesAssigned);
    });

    it('assigns the chosen role, then reloads the user', async () => {
      await open();
      await (await loader.getHarness(MatSelectHarness)).clickOptions({ text: 'EDITOR' });
      expect(page.hasUnsavedChanges()).toBe(true);

      await (await button(fr.admin.users.detail.assign))!.click();
      const request = backend.expectOne(`/admin/users/${uuid(5)}/roles`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ role: 'EDITOR' });
      request.flush({ code: 'admin.user.role.assigned' });
      answerUser(target({ roles: [EDITOR] }));
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.user.role.assigned);
      expect(await chips()).toEqual(['EDITOR']);
      expect(page.hasUnsavedChanges()).toBe(false);
    });

    it('shows the assign error', async () => {
      await open();
      await (await loader.getHarness(MatSelectHarness)).clickOptions({ text: 'EDITOR' });
      await (await button(fr.admin.users.detail.assign))!.click();
      backend
        .expectOne(`/admin/users/${uuid(5)}/roles`)
        .flush(
          { code: 'admin.role.not_found', params: { roleName: 'EDITOR' } },
          { status: 404, statusText: 'Error' },
        );
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.role.not_found);
    });

    it('translates the role already assigned error', async () => {
      await open();
      await (await loader.getHarness(MatSelectHarness)).clickOptions({ text: 'EDITOR' });
      await (await button(fr.admin.users.detail.assign))!.click();
      backend
        .expectOne(`/admin/users/${uuid(5)}/roles`)
        .flush({ code: 'admin.user.role_already_assigned' }, { status: 409, statusText: 'Error' });
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.user.role_already_assigned);
    });

    it('asks before removing a role and does nothing when cancelled', async () => {
      await open(target({ roles: [EDITOR] }));

      await (await loader.getHarness(MatChipHarness)).remove();
      expect(dialog()!.textContent).toContain(
        fr.admin.users.detail.removeRole.confirm.replace('{{ role }}', 'EDITOR'),
      );
      await answerDialog(false);

      expect(dialog()).toBeNull();
      expect(await chips()).toEqual(['EDITOR']);
    });

    it('removes the role once confirmed, then reloads the user', async () => {
      await open(target({ roles: [EDITOR] }));

      await (await loader.getHarness(MatChipHarness)).remove();
      await answerDialog(true);
      const request = backend.expectOne(`/admin/users/${uuid(5)}/roles/${uuid(2)}`);
      expect(request.request.method).toBe('DELETE');
      request.flush({ code: 'admin.user.role.removed' });
      answerUser(target());
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.user.role.removed);
      expect(text()).toContain(fr.admin.users.detail.noRoles);
    });

    it('warns harder when removing one of your own roles', async () => {
      signIn(ALL_PERMISSIONS, uuid(5));
      await open(target({ roles: [EDITOR] }));

      await (await loader.getHarness(MatChipHarness)).remove();

      expect(dialog()!.textContent).toContain(
        fr.admin.users.detail.removeRole.confirmSelf.replace('{{ role }}', 'EDITOR'),
      );
      await answerDialog(false);
    });
  });

  describe('deletion', () => {
    it('says in the danger zone that deletion is permanent', async () => {
      await open();

      expect(text()).toContain(fr.admin.users.detail.delete.description);
    });

    it('only allows deleting a user without roles', async () => {
      await open(target({ roles: [EDITOR] }));

      expect(await (await deleteButton())!.isDisabled()).toBe(true);
      expect(text()).toContain(fr.admin.users.detail.delete.hasRolesHint);
    });

    it('deletes the user once confirmed and goes back to the list', async () => {
      await open();

      await (await deleteButton())!.click();
      expect(dialog()!.textContent).toContain(
        fr.admin.users.detail.delete.confirm.replace('{{ name }}', 'Jo'),
      );
      await answerDialog(true);
      const request = backend.expectOne(`/admin/users/${uuid(5)}`);
      expect(request.request.method).toBe('DELETE');
      request.flush({ code: 'admin.user.deleted' });
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/admin/users');
    });

    it('warns harder when deleting your own account', async () => {
      signIn(ALL_PERMISSIONS, uuid(5));
      await open();

      await (await deleteButton())!.click();

      expect(dialog()!.textContent).toContain(fr.admin.users.detail.delete.confirmSelf);
      await answerDialog(false);
    });

    it('shows the delete error and stays on the page', async () => {
      await open();

      await (await deleteButton())!.click();
      await answerDialog(true);
      backend
        .expectOne(`/admin/users/${uuid(5)}`)
        .flush({ code: 'admin.user.has_roles' }, { status: 400, statusText: 'Error' });
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.user.has_roles);
      expect(TestBed.inject(Router).url).toBe(`/admin/users/${uuid(5)}`);
    });
  });

  it('hides role edition and deletion without the matching permissions', async () => {
    signIn(['realm:admin']);
    await open(target({ roles: [EDITOR] }));

    expect(element().querySelector('[matChipRemove]')).toBeNull();
    expect(await button(fr.admin.users.detail.assign)).toBeNull();
    expect(await deleteButton()).toBeNull();
  });

  describe('sessions', () => {
    it('lists the user sessions with admin:user:session:read', async () => {
      signIn([...ALL_PERMISSIONS, 'admin:user:session:read']);
      // open() waits for stability, which never comes while the sessions load: answer them first
      page = await harness.navigateByUrl(`/admin/users/${uuid(5)}`, UserDetail);
      TestBed.tick();
      backend
        .expectOne((request) => request.url === '/admin/roles')
        .flush({
          data: [ADMIN, EDITOR, VIEWER],
          meta: { total: 3, page: 1, limit: 100, totalPages: 1 },
        });
      answerUser();
      await vi.waitFor(() => {
        harness.fixture.detectChanges();
        expect(element().querySelector('app-sessions-list')).not.toBeNull();
      });
      TestBed.tick();
      backend
        .expectOne((request) => request.url === `/admin/users/${uuid(5)}/sessions`)
        .flush({
          data: [
            {
              id: uuid(9),
              userId: uuid(5),
              createdAt: '2026-11-01T08:30:00.000Z',
              expiresAt: '2026-11-08T08:30:00.000Z',
            },
          ],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        });
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.admin.users.detail.sections.sessions);
      expect(element().querySelectorAll('app-sessions-list tr.mat-mdc-row')).toHaveLength(1);
    });

    it('hides the sessions without admin:user:session:read', async () => {
      await open();

      expect(text()).not.toContain(fr.admin.users.detail.sections.sessions);
      backend.expectNone((r) => r.url === `/admin/users/${uuid(5)}/sessions`);
    });
  });

  describe('recent activity', () => {
    const AUDIT_PERMISSIONS = [...ALL_PERMISSIONS, 'realm:audit', 'audit:log:read'];
    const log = (
      id: number,
      action: string,
      targetType: string | null,
      targetId: string | null,
    ) => ({
      id: uuid(id),
      action,
      actorId: uuid(5),
      targetId,
      targetType,
      metadata: null,
      createdAt: '2026-11-01T08:30:00.000Z',
    });

    // The activity loads alongside the user: answer it with the given response
    async function openWithActivity(body: object, status = 200) {
      signIn(AUDIT_PERMISSIONS);
      page = await harness.navigateByUrl(`/admin/users/${uuid(5)}`, UserDetail);
      TestBed.tick();
      backend
        .expectOne((request) => request.url === '/admin/roles')
        .flush({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } });
      const activity = backend.expectOne((request) => request.url === '/admin/audit-logs');
      activity.flush(body, { status, statusText: status === 200 ? 'OK' : 'Error' });
      answerUser();
      await harness.fixture.whenStable();
      return activity.request;
    }

    it('lists the last actions made by the user', async () => {
      const request = await openWithActivity({
        data: [log(2, 'user.role.assign', 'user', uuid(7)), log(1, 'profile.update', null, null)],
        meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

      expect(request.params.get('actorId')).toBe(uuid(5));
      expect(request.params.get('sortBy')).toBe('createdAt');
      expect(request.params.get('sortOrder')).toBe('desc');
      expect(request.params.get('limit')).toBe('10');
      const section = element().querySelector('.user-detail__activity')!;
      expect(text()).toContain(fr.admin.users.detail.sections.activity);
      expect(section.querySelectorAll('tr.mat-mdc-row')).toHaveLength(2);
      expect(section.textContent).toContain(fr.admin.audit.actions.user.role.assign);
      expect(section.textContent!.replace(/\s+/g, ' ')).toContain(
        `${fr.admin.audit.targetTypes.user} …00000007`,
      );
    });

    it('says when the user has no activity', async () => {
      await openWithActivity({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });

      expect(text()).toContain(fr.admin.users.detail.activity.empty);
    });

    it('shows the activity error', async () => {
      await openWithActivity({ code: 'forbidden' }, 403);

      expect(element().querySelector('[role="alert"]')!.textContent).toContain(fr.api.forbidden);
    });

    it.each([
      ['audit:log:read', [...ALL_PERMISSIONS, 'realm:audit']],
      ['realm:audit', [...ALL_PERMISSIONS, 'audit:log:read']],
    ])('hides the activity without %s', async (_, permissions) => {
      signIn(permissions);
      await open();

      expect(text()).not.toContain(fr.admin.users.detail.sections.activity);
      backend.expectNone((request) => request.url === '/admin/audit-logs');
    });
  });

  describe('tab title', () => {
    const title = () => TestBed.inject(Title).getTitle();

    it('shows the user name once the user is loaded', async () => {
      await harness.navigateByUrl(`/admin/users/${uuid(5)}`, UserDetail);
      expect(title()).toBe(`${fr.common.title.admin.user} — LinkedMe Admin`);

      TestBed.tick();
      backend
        .expectOne((request) => request.url === '/admin/roles')
        .flush({ data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } });
      answerUser();
      await harness.fixture.whenStable();

      expect(title()).toBe(`Jo — ${fr.common.title.admin.user} — LinkedMe Admin`);
    });

    it('forgets the user name when leaving the page', async () => {
      await open();

      await harness.navigateByUrl('/admin/users');

      expect(title()).toBe('LinkedMe Admin');
    });
  });
});
