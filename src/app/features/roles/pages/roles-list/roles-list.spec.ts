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
import { RoleResponse } from '../../../../shared/models/role.model';
import { fr, provideTestDefaults, testUser, uuid } from '../../../../../testing/test-providers';
import { RolesList } from './roles-list';

@Component({ template: '' })
class DetailStub {}

const role = (id: number, name: string, permissionCount: number): RoleResponse => ({
  id: uuid(id),
  name,
  createdAt: `2026-11-0${id}T08:00:00.000Z`,
  updatedAt: `2026-11-1${id}T08:00:00.000Z`,
  permissions: Array.from({ length: permissionCount }, (_, index) => ({
    id: uuid(index + 1),
    name: `realm:permission-${index + 1}`,
  })),
});
const ADMIN = role(1, 'ADMIN', 3);
const EDITOR = role(2, 'EDITOR', 0);

const page = (data: RoleResponse[], total = data.length) => ({
  data,
  meta: { total, page: 1, limit: 20, totalPages: Math.ceil(total / 20) },
});

describe('RolesList', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  let router: Router;
  let list: RolesList;

  const element = () => harness.routeNativeElement!;
  const text = () => element().textContent!;
  const paramsOf = (request: TestRequest) =>
    Object.fromEntries(
      request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
    );

  // The roles resource (re)loads: return its pending request
  function listRequest(): TestRequest {
    TestBed.tick();
    return backend.expectOne((request) => request.url === '/admin/roles');
  }

  async function answer(request: TestRequest, roles = [ADMIN, EDITOR], total = roles.length) {
    request.flush(page(roles, total));
    await harness.fixture.whenStable();
  }

  // Opens the list at this URL and returns the pending request
  async function open(url = '/admin/roles'): Promise<TestRequest> {
    list = await harness.navigateByUrl(url, RolesList);
    return listRequest();
  }

  async function urlBecomes(url: string) {
    await vi.waitFor(() => expect(router.url).toBe(url));
  }

  // While the list loads the app is not stable, so harness actions would wait: act on the DOM
  function type(value: string) {
    const input = element().querySelector<HTMLInputElement>('input[formcontrolname="search"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function click(selector: string) {
    element().querySelector<HTMLElement>(selector)!.click();
  }

  function signIn(permissions = ['realm:admin', 'admin:role:manage']) {
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set(testUser(permissions));
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter(
          [
            { path: 'admin/roles', component: RolesList },
            { path: 'admin/roles/:id', component: DetailStub },
          ],
          withComponentInputBinding(),
        ),
      ],
    });
    signIn();
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => backend.verify());

  describe('loading', () => {
    it('loads the first 20 roles, newest first, with their permission count', async () => {
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
      expect(cells['name'].text).toEqual(['ADMIN', 'EDITOR']);
      expect(cells['permissions'].text).toEqual(['3', '0']);
      expect(cells['createdAt'].text).toEqual([format(ADMIN.createdAt), format(EDITOR.createdAt)]);
      expect(cells['updatedAt'].text).toEqual([format(ADMIN.updatedAt), format(EDITOR.updatedAt)]);
    });

    it('reads pagination, sort and search from the URL', async () => {
      const request = await open(
        '/admin/roles?page=2&limit=10&sortBy=updatedAt&sortOrder=asc&search=ed',
      );

      expect(paramsOf(request)).toEqual({
        page: '2',
        limit: '10',
        sortBy: 'updatedAt',
        sortOrder: 'asc',
        search: 'ed',
      });
      await answer(request, [EDITOR], 11);

      expect(list.filterForm.getRawValue()).toEqual({ search: 'ed' });
    });

    it('removes invalid and default values from the URL without loading twice', async () => {
      const request = await open(
        '/admin/roles?page=-1&limit=100&sortBy=id&sortOrder=up&search=%20',
      );

      expect(paramsOf(request)).toEqual({
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      await answer(request);
      await urlBecomes('/admin/roles');
      TestBed.tick();
      backend.expectNone((r) => r.url === '/admin/roles');
    });

    it('shows the API error', async () => {
      (await open()).flush(
        { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
        { status: 429, statusText: 'Error' },
      );
      await harness.fixture.whenStable();

      expect(text()).toContain('2 min');
      expect(text()).not.toContain(fr.admin.roles.empty);
    });
  });

  describe('changing the view', () => {
    it('searches after a pause, back to the first page', async () => {
      await answer(await open('/admin/roles?page=3'), [ADMIN], 60);

      type('ed');
      await urlBecomes('/admin/roles?search=ed');
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ page: '1', search: 'ed' });
      await answer(request, [EDITOR]);
    });

    it('clears the search with its button', async () => {
      await answer(await open('/admin/roles?search=ed'), [EDITOR]);

      click(`button[aria-label="${fr.admin.roles.clearSearch}"]`);

      await urlBecomes('/admin/roles');
      await answer(listRequest());
    });

    it('sorts by name when its header is clicked', async () => {
      await answer(await open());

      click('th[mat-sort-header="name"]');

      await urlBecomes('/admin/roles?sortBy=name&sortOrder=asc');
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ sortBy: 'name', sortOrder: 'asc' });
      await answer(request);
    });

    it('sorts by date ascending on the first click, then back to the default descending', async () => {
      await answer(await open());

      click('th[mat-sort-header="createdAt"]');

      await urlBecomes('/admin/roles?sortOrder=asc');
      const ascending = listRequest();
      expect(paramsOf(ascending)).toMatchObject({ sortBy: 'createdAt', sortOrder: 'asc' });
      await answer(ascending);

      click('th[mat-sort-header="createdAt"]');

      await urlBecomes('/admin/roles');
      const descending = listRequest();
      expect(paramsOf(descending)).toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc' });
      await answer(descending);
    });

    it('goes to the next page and keeps the rows while it loads', async () => {
      await answer(await open(), [ADMIN, EDITOR], 45);

      click('.mat-mdc-paginator-navigation-next');

      await urlBecomes('/admin/roles?page=2');
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ page: '2' });
      harness.fixture.detectChanges();
      expect(element().querySelectorAll('tr.mat-mdc-row')).toHaveLength(2);
      await answer(request, [role(3, 'VIEWER', 1)], 45);
    });
  });

  describe('empty list', () => {
    it('only says there is no role when nothing is searched', async () => {
      await answer(await open(), []);

      expect(text()).toContain(fr.admin.roles.empty);
      expect(text()).not.toContain(fr.common.emptyFiltered.reset);
    });

    it('offers to reset the search, which brings back the base view', async () => {
      await answer(await open('/admin/roles?search=zzz'), []);

      expect(text()).toContain(fr.common.emptyFiltered.hint);
      Array.from(element().querySelectorAll('button'))
        .find((button) => button.textContent!.includes(fr.common.emptyFiltered.reset))!
        .click();

      await urlBecomes('/admin/roles');
      await answer(listRequest());
    });
  });

  describe('create button', () => {
    const createLink = () =>
      Array.from(element().querySelectorAll('a')).find((link) =>
        link.textContent!.includes(fr.admin.roles.create),
      );

    it('links to the creation page with admin:role:manage', async () => {
      await answer(await open());

      expect(createLink()!.getAttribute('href')).toBe('/admin/roles/new');
    });

    it('is hidden without admin:role:manage', async () => {
      signIn(['realm:admin']);
      await answer(await open());

      expect(createLink()).toBeUndefined();
    });
  });

  it('opens the role detail from its row', async () => {
    await answer(await open());

    click(`tr.mat-mdc-row button[aria-label="${fr.admin.roles.viewDetail}"]`);

    await urlBecomes(`/admin/roles/${uuid(1)}`);
  });

  it('remembers the list URL for the way back from a detail page', async () => {
    await answer(await open('/admin/roles?search=ed&page=2'), [EDITOR], 30);

    expect(router.serializeUrl(TestBed.inject(UrlService).listLink('/admin/roles'))).toBe(
      '/admin/roles?search=ed&page=2',
    );
  });
});
