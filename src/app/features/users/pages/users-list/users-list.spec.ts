import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { formatDate } from '@angular/common';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatTableHarness } from '@angular/material/table/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { UrlService } from '../../../../core/services/url.service';
import { RoleBasicResponse } from '../../../../shared/models/role.model';
import { UserAdminResponse } from '../../../../shared/models/user-admin.model';
import { fr, provideTestDefaults, testUser, uuid } from '../../../../../testing/test-providers';
import { UsersList } from './users-list';

@Component({ template: '' })
class DetailStub {}

const role = (id: number, name: string): RoleBasicResponse => ({
  id: uuid(id),
  name,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});
const ADMIN = role(1, 'ADMIN');
const EDITOR = role(2, 'EDITOR');

const user = (id: number, name: string, roles: RoleBasicResponse[] = []): UserAdminResponse => ({
  id: uuid(id),
  name,
  email: `${name.toLowerCase()}@test.dev`,
  isEmailChecked: id % 2 === 1,
  failedLoginAttempts: 0,
  lockedUntil: null,
  createdAt: `2026-11-0${id}T08:00:00.000Z`,
  updatedAt: `2026-11-0${id}T08:00:00.000Z`,
  roles,
});
const JO = user(1, 'Jo', [ADMIN, EDITOR]);
const ANN = user(2, 'Ann');

const page = (data: UserAdminResponse[], total = data.length) => ({
  data,
  meta: { total, page: 1, limit: 20, totalPages: Math.ceil(total / 20) },
});

describe('UsersList', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  let router: Router;
  let list: UsersList;

  const element = () => harness.routeNativeElement!;
  const text = () => element().textContent!;
  const paramsOf = (request: TestRequest) =>
    Object.fromEntries(
      request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
    );

  // The users resource (re)loads: return its pending request
  function usersRequest(): TestRequest {
    TestBed.tick();
    return backend.expectOne((request) => request.url === '/admin/users');
  }

  async function answer(request: TestRequest, users = [JO, ANN], total = users.length) {
    request.flush(page(users, total));
    await harness.fixture.whenStable();
  }

  function answerRoles() {
    backend
      .expectOne((request) => request.url === '/admin/roles')
      .flush({ data: [ADMIN, EDITOR], meta: { total: 2, page: 1, limit: 100, totalPages: 1 } });
  }

  // Opens the list at this URL, answers the roles, returns the pending users request
  async function open(url = '/admin/users'): Promise<TestRequest> {
    list = await harness.navigateByUrl(url, UsersList);
    TestBed.tick();
    answerRoles();
    return usersRequest();
  }

  async function urlBecomes(url: string) {
    await vi.waitFor(() => expect(router.url).toBe(url));
  }

  // While a list loads the app is not stable, so harness actions would wait: act on the DOM
  function type(value: string) {
    const input = element().querySelector<HTMLInputElement>('input[formcontrolname="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function click(selector: string) {
    element().querySelector<HTMLElement>(selector)!.click();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter(
          [
            { path: 'admin/users', component: UsersList },
            { path: 'admin/users/:id', component: DetailStub },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set(testUser(['realm:admin']));
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => backend.verify());

  describe('loading', () => {
    it('loads the first 20 users, newest first, and the roles for the filter', async () => {
      const request = await open();

      expect(paramsOf(request)).toEqual({
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      await answer(request);

      const format = (date: string) => formatDate(date, fr.common.dateTimeFormat, 'en-US');
      const table = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
        MatTableHarness,
      );
      const cells = await table.getCellTextByColumnName();
      expect(cells['identity'].text).toEqual(['Jojo@test.dev', 'Annann@test.dev']);
      expect(cells['roles'].text).toEqual(['ADMINEDITOR', '']);
      expect(cells['createdAt'].text).toEqual([format(JO.createdAt), format(ANN.createdAt)]);
    });

    it('reads pagination, sort and filters from the URL', async () => {
      const request = await open(
        '/admin/users?page=2&limit=50&sortBy=name&sortOrder=asc&search=jo&role=ADMIN&isEmailChecked=false',
      );

      expect(paramsOf(request)).toEqual({
        page: '2',
        limit: '50',
        sortBy: 'name',
        sortOrder: 'asc',
        search: 'jo',
        role: 'ADMIN',
        isEmailChecked: 'false',
      });
      await answer(request, [JO], 51);

      expect(list.filterForm.getRawValue()).toEqual({
        search: 'jo',
        role: 'ADMIN',
        isEmailChecked: 'false',
      });
    });

    it('removes invalid and default values from the URL without loading twice', async () => {
      const request = await open(
        '/admin/users?page=0&limit=7&sortBy=email&sortOrder=up&isEmailChecked=maybe&search=%20',
      );

      expect(paramsOf(request)).toEqual({
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      await answer(request);
      await urlBecomes('/admin/users');
      TestBed.tick();
      backend.expectNone((r) => r.url === '/admin/users');
    });

    it('drops a role that does not exist once the roles are known', async () => {
      list = await harness.navigateByUrl('/admin/users?role=NOPE', UsersList);
      TestBed.tick();
      const first = backend.expectOne((r) => r.url === '/admin/users');
      expect(paramsOf(first)['role']).toBe('NOPE');
      answerRoles();
      first.flush(page([]));

      await urlBecomes('/admin/users');
      const second = usersRequest();
      expect(paramsOf(second)['role']).toBeUndefined();
      await answer(second);
    });

    it('shows the API error', async () => {
      (await open()).flush(
        { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
        { status: 429, statusText: 'Error' },
      );
      await harness.fixture.whenStable();

      expect(text()).toContain('2 min');
      expect(text()).not.toContain(fr.admin.users.empty);
    });
  });

  describe('changing the view', () => {
    it('searches after a pause, back to the first page', async () => {
      await answer(await open('/admin/users?page=3'), [JO], 60);

      type('ann');
      await urlBecomes('/admin/users?search=ann');
      const request = usersRequest();
      expect(paramsOf(request)).toMatchObject({ page: '1', search: 'ann' });
      await answer(request, [ANN]);
    });

    it('clears the search with its button', async () => {
      await answer(await open('/admin/users?search=jo'), [JO]);

      click(`button[aria-label="${fr.admin.users.clearSearch}"]`);

      await urlBecomes('/admin/users');
      await answer(usersRequest());
    });

    it.each([
      ['role', 'ADMIN', '/admin/users?role=ADMIN', { role: 'ADMIN' }],
      ['isEmailChecked', 'true', '/admin/users?isEmailChecked=true', { isEmailChecked: 'true' }],
    ])('filters by %s, back to the first page', async (control, value, url, params) => {
      await answer(await open('/admin/users?page=2'), [JO], 40);

      list.filterForm.controls[control].setValue(value);

      await urlBecomes(url);
      const request = usersRequest();
      expect(paramsOf(request)).toMatchObject({ page: '1', ...params });
      await answer(request);
    });

    it('sorts by name when its header is clicked', async () => {
      await answer(await open());

      click('th[mat-sort-header="name"]');

      await urlBecomes('/admin/users?sortBy=name&sortOrder=asc');
      const request = usersRequest();
      expect(paramsOf(request)).toMatchObject({ sortBy: 'name', sortOrder: 'asc' });
      await answer(request);
    });

    it('sorts by date ascending on the first click, then back to the default descending', async () => {
      await answer(await open());

      click('th[mat-sort-header="createdAt"]');

      await urlBecomes('/admin/users?sortOrder=asc');
      const ascending = usersRequest();
      expect(paramsOf(ascending)).toMatchObject({ sortBy: 'createdAt', sortOrder: 'asc' });
      await answer(ascending);

      click('th[mat-sort-header="createdAt"]');

      await urlBecomes('/admin/users');
      const descending = usersRequest();
      expect(paramsOf(descending)).toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc' });
      await answer(descending);
    });

    it('goes to the next page and keeps the rows while it loads', async () => {
      await answer(await open(), [JO, ANN], 45);

      click('.mat-mdc-paginator-navigation-next');

      await urlBecomes('/admin/users?page=2');
      const request = usersRequest();
      expect(paramsOf(request)).toMatchObject({ page: '2' });
      harness.fixture.detectChanges();
      expect(element().querySelectorAll('tr.mat-mdc-row')).toHaveLength(2);
      await answer(request, [user(3, 'Lea')], 45);
    });
  });

  describe('empty list', () => {
    it('only says there is no user when nothing is filtered', async () => {
      await answer(await open(), []);

      expect(text()).toContain(fr.admin.users.empty);
      expect(text()).not.toContain(fr.common.emptyFiltered.reset);
    });

    it('offers to reset the filters, which brings back the base view', async () => {
      await answer(await open('/admin/users?search=zzz&role=ADMIN'), []);

      expect(text()).toContain(fr.common.emptyFiltered.hint);
      Array.from(element().querySelectorAll('button'))
        .find((button) => button.textContent!.includes(fr.common.emptyFiltered.reset))!
        .click();

      await urlBecomes('/admin/users');
      await answer(usersRequest());
    });
  });

  it('opens the user detail from its row', async () => {
    await answer(await open());

    click(`tr.mat-mdc-row button[aria-label="${fr.admin.users.viewDetail}"]`);

    await urlBecomes(`/admin/users/${uuid(1)}`);
  });

  it('remembers the list URL for the way back from a detail page', async () => {
    await answer(await open('/admin/users?search=jo&page=2'), [JO], 30);

    expect(router.serializeUrl(TestBed.inject(UrlService).listLink('/admin/users'))).toBe(
      '/admin/users?search=jo&page=2',
    );
  });
});
