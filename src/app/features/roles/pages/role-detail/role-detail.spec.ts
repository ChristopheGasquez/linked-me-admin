import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { formatDate } from '@angular/common';
import { HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { PermissionResponse } from '../../../../shared/models/permission.model';
import { RoleResponse } from '../../../../shared/models/role.model';
import { fr, provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { RoleDetail } from './role-detail';

@Component({ template: '' })
class ListStub {}

const MANAGE = { id: 1, name: 'admin:role:manage' };
const USER_READ = { id: 2, name: 'admin:user:read' };
const AUDIT_READ = { id: 3, name: 'audit:log:read' };
const PROFILE_READ = { id: 4, name: 'profile:read:own' };
const ALL: PermissionResponse[] = [MANAGE, USER_READ, AUDIT_READ, PROFILE_READ];

const editor = (overrides: Partial<RoleResponse> = {}): RoleResponse => ({
  id: 3,
  name: 'EDITOR',
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-02T08:00:00.000Z',
  permissions: [USER_READ, PROFILE_READ],
  ...overrides,
});

const MANAGER = ['realm:admin', 'admin:role:manage', 'admin:permission:read'];

// Fills a translation like Transloco does
const message = (template: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{{ ${key} }}`, String(value)),
    template,
  );

describe('RoleDetail', () => {
  let harness: RouterTestingHarness;
  let loader: HarnessLoader;
  let backend: HttpTestingController;
  let page: RoleDetail;

  const element = () => harness.routeNativeElement!;
  const text = () => element().textContent!;
  const button = (label: string | RegExp) =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: label }));
  const editButton = () => button(new RegExp(fr.admin.roles.detail.edit));
  const saveButton = () => button(fr.admin.roles.detail.save.button);
  const deleteButton = () => button(fr.admin.roles.detail.delete.button);
  const createButton = () => button(fr.admin.roles.detail.create.button);
  const dialog = () => document.querySelector<HTMLElement>('mat-dialog-container');
  const boxes = () => loader.getAllHarnesses(MatCheckboxHarness);
  const box = (name: string) => loader.getHarness(MatCheckboxHarness.with({ label: name }));
  const checkedNames = async () => {
    const names: string[] = [];
    for (const item of await boxes()) {
      if (await item.isChecked()) names.push(await item.getLabelText());
    }
    return names;
  };
  const allDisabled = async () =>
    (await Promise.all((await boxes()).map((item) => item.isDisabled()))).every(Boolean);

  function signIn(permissions = MANAGER, roles: string[] = []) {
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set({ ...testUser(permissions), roles });
  }

  function answerPermissions() {
    backend
      .expectOne((request) => request.url === '/admin/permissions')
      .flush({ data: ALL, meta: { total: 4, page: 1, limit: 100, totalPages: 1 } });
  }

  // The role resource (re)loads: answer it
  function answerRole(role = editor()) {
    TestBed.tick();
    backend.expectOne(`/admin/roles/${role.id}`).flush(role);
  }

  async function settle() {
    await harness.fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
  }

  async function open(role = editor(), { listPermissions = true } = {}) {
    page = await harness.navigateByUrl(`/admin/roles/${role.id}`, RoleDetail);
    TestBed.tick();
    if (listPermissions) answerPermissions();
    answerRole(role);
    await settle();
  }

  async function openCreate() {
    page = await harness.navigateByUrl('/admin/roles/new', RoleDetail);
    TestBed.tick();
    answerPermissions();
    await settle();
  }

  async function answerDialog(confirm: boolean) {
    const [cancel, ok] = Array.from(dialog()!.querySelectorAll('button'));
    (confirm ? ok : cancel).click();
    await harness.fixture.whenStable();
  }

  // Edits EDITOR: adds audit:log:read, removes admin:user:read
  async function editAndSave() {
    await (await editButton())!.click();
    await (await box('audit:log:read')).check();
    await (await box('admin:user:read')).uncheck();
    await (await saveButton())!.click();
  }

  // Creates EDITOR with two permissions, up to the permissions request
  async function createEditor() {
    await openCreate();
    await (await loader.getHarness(MatInputHarness)).setValue(' editor ');
    await (await box('audit:log:read')).check();
    await (await box('profile:read:own')).check();
    await (await createButton())!.click();
    await answerDialog(true);
    backend
      .expectOne('/admin/roles')
      .flush({
        id: 7,
        name: 'EDITOR',
        createdAt: editor().createdAt,
        updatedAt: editor().updatedAt,
      });
  }

  // After creation the page navigates to the new role, which loads again
  async function landOnNewRole(role: RoleResponse) {
    const router = TestBed.inject(Router);
    await vi.waitFor(() => expect(router.url).toBe('/admin/roles/7'));
    TestBed.tick();
    answerPermissions();
    answerRole(role);
    await settle();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter(
          [
            {
              path: 'admin/roles',
              data: { breadcrumb: 'layout.private.sidenav.roles' },
              children: [
                { path: '', component: ListStub },
                { path: 'new', component: RoleDetail },
                { path: ':id', component: RoleDetail },
              ],
            },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    signIn();
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => backend.verify());

  describe('display', () => {
    it('loads the role and every permission sorted by name, grouped by realm', async () => {
      page = await harness.navigateByUrl('/admin/roles/3', RoleDetail);
      TestBed.tick();
      const permissions = backend.expectOne((request) => request.url === '/admin/permissions');
      expect(
        ['limit', 'sortBy', 'sortOrder'].map((key) => permissions.request.params.get(key)),
      ).toEqual(['100', 'name', 'asc']);
      permissions.flush({ data: ALL, meta: { total: 4, page: 1, limit: 100, totalPages: 1 } });
      answerRole();
      await settle();

      const realms = Array.from(element().querySelectorAll('h3')).map((h3) =>
        h3.textContent!.trim(),
      );
      expect(realms).toEqual(['admin', 'audit', 'profile']);
      expect(await checkedNames()).toEqual(['admin:user:read', 'profile:read:own']);
      expect(await allDisabled()).toBe(true);
      expect(text()).toContain('(2/4)');

      const format = (date: string) => formatDate(date, fr.common.dateTimeFormat, 'en-US');
      const values = await Promise.all(
        (await loader.getAllHarnesses(MatInputHarness)).map((input) => input.getValue()),
      );
      expect(values).toEqual(['3', format(editor().createdAt), format(editor().updatedAt)]);
    });

    it('shows only the role permissions without the right to list them all', async () => {
      signIn(['realm:admin', 'admin:role:manage']);
      await open(editor(), { listPermissions: false });

      expect(await checkedNames()).toEqual(['admin:user:read', 'profile:read:own']);
      expect(await boxes()).toHaveLength(2);
      expect(text()).toContain('(2)');
      expect(await editButton()).toBeNull();
    });

    it('shows the API error when the role cannot be loaded', async () => {
      await harness.navigateByUrl('/admin/roles/3', RoleDetail);
      TestBed.tick();
      answerPermissions();
      backend
        .expectOne('/admin/roles/3')
        .flush({ code: 'admin.role.not_found' }, { status: 404, statusText: 'Error' });
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.role.not_found);
    });

    it('goes back to the roles list', async () => {
      await open();

      expect(element().querySelector('a')!.getAttribute('href')).toBe('/admin/roles');
    });
  });

  describe('edition', () => {
    it('starts from the role permissions and enables save once something changes', async () => {
      await open();
      await (await editButton())!.click();

      expect(await allDisabled()).toBe(false);
      expect(await checkedNames()).toEqual(['admin:user:read', 'profile:read:own']);
      expect(await (await saveButton())!.isDisabled()).toBe(true);
      expect(await deleteButton()).toBeNull();
      expect(page.hasUnsavedChanges()).toBe(false);

      await (await box('audit:log:read')).check();

      expect(await (await saveButton())!.isDisabled()).toBe(false);
      expect(page.hasUnsavedChanges()).toBe(true);
    });

    it('drops the changes when cancelled', async () => {
      await open();
      await (await editButton())!.click();
      await (await box('audit:log:read')).check();

      await (await button(fr.common.cancel))!.click();

      expect(await allDisabled()).toBe(true);
      expect(await checkedNames()).toEqual(['admin:user:read', 'profile:read:own']);
      expect(page.hasUnsavedChanges()).toBe(false);
    });

    it('lists the changes before saving and sends nothing when the dialog is cancelled', async () => {
      await open();
      await editAndSave();

      expect(dialog()!.textContent).toContain(
        message(fr.admin.roles.detail.save.confirm, {
          added: 'audit:log:read',
          removed: 'admin:user:read',
        }),
      );
      await answerDialog(false);

      expect(await saveButton()).not.toBeNull();
    });

    it('adds then removes the permissions, one request after the other, then reloads', async () => {
      await open();
      await editAndSave();
      await answerDialog(true);

      const add = backend.expectOne('/admin/roles/3/permissions');
      expect(add.request.method).toBe('POST');
      expect(add.request.body).toEqual({ permissions: ['audit:log:read'] });
      backend.expectNone('/admin/roles/3/permissions/2');
      add.flush(editor({ permissions: [USER_READ, AUDIT_READ, PROFILE_READ] }));

      const remove = backend.expectOne('/admin/roles/3/permissions/2');
      expect(remove.request.method).toBe('DELETE');
      remove.flush({ code: 'admin.role.permission.removed' });
      answerRole(editor({ permissions: [AUDIT_READ, PROFILE_READ] }));
      await settle();

      expect(text()).toContain(fr.admin.roles.detail.save.success);
      expect(await checkedNames()).toEqual(['audit:log:read', 'profile:read:own']);
      expect(await allDisabled()).toBe(true);
    });

    it('warns when editing a role you own, then reloads your own permissions', async () => {
      signIn(MANAGER, ['EDITOR']);
      await open();
      await editAndSave();

      expect(dialog()!.textContent).toContain(
        message(fr.admin.roles.detail.save.confirmSelf, {
          added: 'audit:log:read',
          removed: 'admin:user:read',
        }),
      );
      await answerDialog(true);
      backend.expectOne('/admin/roles/3/permissions').flush(editor());
      backend
        .expectOne('/admin/roles/3/permissions/2')
        .flush({ code: 'admin.role.permission.removed' });
      answerRole(editor({ permissions: [AUDIT_READ, PROFILE_READ] }));
      backend.expectOne('/auth/me').flush({ ...testUser(MANAGER), roles: ['EDITOR'] });
      await settle();
    });

    it('warns that nobody could give admin:role:manage back to ADMIN', async () => {
      await open(editor({ name: 'ADMIN', permissions: [MANAGE, USER_READ] }));
      await (await editButton())!.click();
      await (await box('admin:role:manage')).uncheck();
      await (await saveButton())!.click();

      expect(dialog()!.textContent).toContain(
        message(fr.admin.roles.detail.save.confirmAdminManage, {
          added: '—',
          removed: 'admin:role:manage',
        }),
      );
      await answerDialog(false);
    });

    it('stops at the first failure, shows it and reloads the role', async () => {
      await open();
      await editAndSave();
      await answerDialog(true);

      backend
        .expectOne('/admin/roles/3/permissions')
        .flush(
          { code: 'admin.permission.unknown', params: { permissions: 'audit:log:read' } },
          { status: 400, statusText: 'Error' },
        );
      answerRole();
      await settle();

      expect(text()).toContain(
        message(fr.api.admin.permission.unknown, { permissions: 'audit:log:read' }),
      );
      expect(await allDisabled()).toBe(true);
    });
  });

  describe('creation', () => {
    it('offers a name field and every permission unchecked', async () => {
      await openCreate();

      expect(await boxes()).toHaveLength(4);
      expect(await checkedNames()).toEqual([]);
      expect(await allDisabled()).toBe(false);
      expect(await deleteButton()).toBeNull();
      expect(await (await createButton())!.isDisabled()).toBe(true);

      const name = await loader.getHarness(MatInputHarness);
      await name.setValue('x');
      await name.setValue('');
      await name.blur();
      expect(await (await loader.getHarness(MatFormFieldHarness)).getTextErrors()).toEqual([
        fr.admin.roles.detail.fields.nameRequired,
      ]);
    });

    it('refuses a name the API would reject', async () => {
      await openCreate();
      const name = await loader.getHarness(MatInputHarness);
      await name.setValue('mon role');
      await name.blur();

      expect(await (await loader.getHarness(MatFormFieldHarness)).getTextErrors()).toEqual([
        fr.admin.roles.detail.fields.namePattern,
      ]);
      expect(await (await createButton())!.isDisabled()).toBe(true);
    });

    it('creates the role in uppercase with its permissions, then opens it', async () => {
      await openCreate();
      await (await loader.getHarness(MatInputHarness)).setValue(' editor ');
      await (await box('audit:log:read')).check();
      await (await box('profile:read:own')).check();
      await (await createButton())!.click();

      expect(dialog()!.textContent).toContain(
        message(fr.admin.roles.detail.create.confirm, { name: 'EDITOR', count: 2 }),
      );
      await answerDialog(true);

      const create = backend.expectOne('/admin/roles');
      expect(create.request.method).toBe('POST');
      expect(create.request.body).toEqual({ name: 'EDITOR' });
      create.flush({
        id: 7,
        name: 'EDITOR',
        createdAt: editor().createdAt,
        updatedAt: editor().updatedAt,
      });

      const permissions = backend.expectOne('/admin/roles/7/permissions');
      expect(permissions.request.body).toEqual({
        permissions: ['audit:log:read', 'profile:read:own'],
      });
      permissions.flush(editor({ id: 7, permissions: [AUDIT_READ, PROFILE_READ] }));
      await landOnNewRole(editor({ id: 7, permissions: [AUDIT_READ, PROFILE_READ] }));

      expect(element().querySelector('.role-detail__header__title')!.textContent).toContain(
        'EDITOR',
      );
      expect(await checkedNames()).toEqual(['audit:log:read', 'profile:read:own']);
    });

    it('opens the created role with the error when its permissions were refused', async () => {
      await createEditor();
      backend
        .expectOne('/admin/roles/7/permissions')
        .flush(
          { code: 'admin.permission.unknown', params: { permissions: 'audit:log:read' } },
          { status: 400, statusText: 'Error' },
        );
      await landOnNewRole(editor({ id: 7, permissions: [] }));

      expect(text()).toContain(
        message(fr.api.admin.permission.unknown, { permissions: 'audit:log:read' }),
      );
    });

    it('shows the creation error and stays on the creation page', async () => {
      await openCreate();
      await (await loader.getHarness(MatInputHarness)).setValue('ADMIN');
      await (await createButton())!.click();
      await answerDialog(true);
      backend
        .expectOne('/admin/roles')
        .flush(
          { code: 'admin.role.already_exists', params: { name: 'ADMIN' } },
          { status: 400, statusText: 'Error' },
        );
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.admin.role.already_exists);
      expect(TestBed.inject(Router).url).toBe('/admin/roles/new');
      expect(await (await createButton())!.isDisabled()).toBe(false);
    });

    it('translates a server validation error', async () => {
      await openCreate();
      await (await loader.getHarness(MatInputHarness)).setValue('EDITOR');
      await (await createButton())!.click();
      await answerDialog(true);
      backend
        .expectOne('/admin/roles')
        .flush(
          {
            code: 'validation.failed',
            params: { fields: [{ key: 'name', code: 'validation.name.matches' }] },
          },
          { status: 400, statusText: 'Error' },
        );
      await harness.fixture.whenStable();

      expect(text()).toContain(fr.api.validation.failed);
    });

    it('reports unsaved changes once a name is typed or a permission checked', async () => {
      await openCreate();
      expect(page.hasUnsavedChanges()).toBe(false);

      const name = await loader.getHarness(MatInputHarness);
      await name.setValue('EDITOR');
      expect(page.hasUnsavedChanges()).toBe(true);

      await name.setValue('');
      await (await box('audit:log:read')).check();
      expect(page.hasUnsavedChanges()).toBe(true);
    });
  });

  describe('deletion', () => {
    it('deletes the role once confirmed and goes back to the list', async () => {
      await open();
      await (await deleteButton())!.click();

      expect(dialog()!.textContent).toContain(
        message(fr.admin.roles.detail.delete.confirm, { name: 'EDITOR' }),
      );
      await answerDialog(true);
      const request = backend.expectOne('/admin/roles/3');
      expect(request.request.method).toBe('DELETE');
      request.flush({ code: 'admin.role.deleted' });
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/admin/roles');
    });

    it('warns harder when deleting a role you own', async () => {
      signIn(MANAGER, ['EDITOR']);
      await open();
      await (await deleteButton())!.click();

      expect(dialog()!.textContent).toContain(
        message(fr.admin.roles.detail.delete.confirmSelf, { name: 'EDITOR' }),
      );
      await answerDialog(false);
    });

    it('shows how many users still have the role and stays on the page', async () => {
      await open();
      await (await deleteButton())!.click();
      await answerDialog(true);
      backend
        .expectOne('/admin/roles/3')
        .flush(
          { code: 'admin.role.has_users', params: { count: 2 } },
          { status: 400, statusText: 'Error' },
        );
      await harness.fixture.whenStable();

      expect(text()).toContain(message(fr.api.admin.role.has_users, { count: 2 }));
      expect(TestBed.inject(Router).url).toBe('/admin/roles/3');
    });
  });

  it('hides edition and deletion without admin:role:manage', async () => {
    signIn(['realm:admin', 'admin:permission:read']);
    await open();

    expect(await editButton()).toBeNull();
    expect(await deleteButton()).toBeNull();
  });
});
