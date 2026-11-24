import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { formatDate } from '@angular/common';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatTableHarness } from '@angular/material/table/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import en from '../../../../../../public/i18n/en.json';
import { AuthService } from '../../../../core/services/auth.service';
import { UrlService } from '../../../../core/services/url.service';
import { AuditLogResponse } from '../../../../shared/models/audit-log.model';
import { fr, provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { AuditLogs } from './audit-logs';

@Component({ template: '' })
class DetailStub {}

const log = (overrides: Partial<AuditLogResponse>): AuditLogResponse => ({
  id: 1,
  action: 'user.delete',
  actorId: null,
  targetId: null,
  targetType: null,
  metadata: null,
  createdAt: '2026-11-01T08:00:00.000Z',
  ...overrides,
});
const ASSIGN = log({
  id: 1,
  action: 'user.role.assign',
  actorId: 5,
  targetType: 'user',
  targetId: 8,
  metadata: { role: 'ADMIN' },
});
const CLEANUP = log({
  id: 2,
  action: 'task.cleanup.audit-logs',
  targetType: 'task',
  createdAt: '2026-11-02T08:00:00.000Z',
});
const CREATE = log({
  id: 3,
  action: 'role.create',
  actorId: 5,
  targetType: 'role',
  targetId: 3,
  createdAt: '2026-11-03T08:00:00.000Z',
});

const page = (data: AuditLogResponse[], total = data.length) => ({
  data,
  meta: { total, page: 1, limit: 20, totalPages: Math.ceil(total / 20) },
});

// Reads a nested translation such as « user.role.assign »
const translation = (source: object, path: string): unknown =>
  path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)?.[key], source);

describe('AuditLogs', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;
  let router: Router;
  let list: AuditLogs;

  const element = () => harness.routeNativeElement!;
  const text = () => element().textContent!;
  const paramsOf = (request: TestRequest) =>
    Object.fromEntries(
      request.request.params.keys().map((key) => [key, request.request.params.get(key)]),
    );
  const links = () =>
    Array.from(element().querySelectorAll('tr.mat-mdc-row a')).map((a) => a.getAttribute('href'));

  // The audit resource (re)loads: return its pending request
  function listRequest(): TestRequest {
    TestBed.tick();
    return backend.expectOne((request) => request.url === '/admin/audit-logs');
  }

  async function answer(
    request: TestRequest,
    logs = [ASSIGN, CLEANUP, CREATE],
    total = logs.length,
  ) {
    request.flush(page(logs, total));
    await harness.fixture.whenStable();
  }

  // Opens the list at this URL and returns the pending request
  async function open(url = '/admin/audit'): Promise<TestRequest> {
    list = await harness.navigateByUrl(url, AuditLogs);
    return listRequest();
  }

  async function urlBecomes(url: string) {
    await vi.waitFor(() => expect(router.url).toBe(url));
  }

  // While the list loads the app is not stable, so harness actions would wait: act on the DOM
  function type(value: string, field = 'actorId') {
    const input = element().querySelector<HTMLInputElement>(`input[formcontrolname="${field}"]`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function click(selector: string) {
    element().querySelector<HTMLElement>(selector)!.click();
  }

  function signIn(permissions = ['realm:audit', 'realm:admin']) {
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
            { path: 'admin/audit', component: AuditLogs },
            { path: 'admin/audit/users/:id', component: DetailStub },
            { path: 'admin/audit/roles/:id', component: DetailStub },
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
    it('loads the 20 latest entries and shows who did what on what', async () => {
      const request = await open();

      expect(paramsOf(request)).toEqual({
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      await answer(request);

      const table = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
        MatTableHarness,
      );
      const cells = await table.getCellTextByColumnName();
      const clean = (values: string[]) => values.map((value) => value.replace(/\s+/g, ' ').trim());
      const actions = fr.admin.audit.actions;
      const targets = fr.admin.audit.targetTypes;
      expect(cells['createdAt'].text).toEqual(
        [ASSIGN, CLEANUP, CREATE].map((entry) =>
          formatDate(entry.createdAt, fr.common.dateTimeFormat, 'en-US'),
        ),
      );
      expect(cells['action'].text).toEqual([
        actions.user.role.assign,
        actions.task.cleanup['audit-logs'],
        actions.role.create,
      ]);
      expect(clean(cells['actor'].text)).toEqual(['#5', fr.admin.audit.system, '#5']);
      expect(clean(cells['target'].text)).toEqual([
        `${targets.user} #8`,
        targets.task,
        `${targets.role} #3`,
      ]);
      expect(element().querySelectorAll('.audit-logs__metadata-icon')).toHaveLength(1);
    });

    it('reads pagination, sort and filters from the URL', async () => {
      const request = await open(
        '/admin/audit?page=2&limit=50&sortOrder=asc&actorId=7&targetId=3&action=role.create&targetType=role',
      );

      expect(paramsOf(request)).toEqual({
        page: '2',
        limit: '50',
        sortBy: 'createdAt',
        sortOrder: 'asc',
        actorId: '7',
        targetId: '3',
        action: 'role.create',
        targetType: 'role',
      });
      await answer(request, [CREATE], 51);

      expect(list.filterForm.getRawValue()).toEqual({
        actorId: 7,
        targetId: 3,
        action: 'role.create',
        targetType: 'role',
      });
    });

    it('removes invalid and default values from the URL without loading twice', async () => {
      const request = await open(
        '/admin/audit?actorId=abc&targetId=-1&action=nope&targetType=planet&sortBy=id&limit=7&page=0',
      );

      expect(paramsOf(request)).toEqual({
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      await answer(request);
      await urlBecomes('/admin/audit');
      TestBed.tick();
      backend.expectNone((r) => r.url === '/admin/audit-logs');
    });

    it('shows the API error', async () => {
      (await open()).flush(
        { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
        { status: 429, statusText: 'Error' },
      );
      await harness.fixture.whenStable();

      expect(text()).toContain('2 min');
      expect(text()).not.toContain(fr.admin.audit.empty);
    });
  });

  describe('changing the view', () => {
    it('filters by actor id after a pause, back to the first page', async () => {
      await answer(await open('/admin/audit?page=3'), [ASSIGN], 60);

      type('12');
      await urlBecomes('/admin/audit?actorId=12');
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ page: '1', actorId: '12' });
      await answer(request, [ASSIGN]);
    });

    it('clears the actor with its button', async () => {
      await answer(await open('/admin/audit?actorId=12'), [ASSIGN]);

      click(`button[aria-label="${fr.admin.audit.clearActor}"]`);

      await urlBecomes('/admin/audit');
      await answer(listRequest());
    });

    it('filters by target id after a pause, back to the first page', async () => {
      await answer(await open('/admin/audit?page=3'), [ASSIGN], 60);

      type('8', 'targetId');
      await urlBecomes('/admin/audit?targetId=8');
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ page: '1', targetId: '8' });
      await answer(request, [ASSIGN]);
    });

    it('clears the target with its button', async () => {
      await answer(await open('/admin/audit?targetId=8'), [ASSIGN]);

      click(`button[aria-label="${fr.admin.audit.clearTarget}"]`);

      await urlBecomes('/admin/audit');
      await answer(listRequest());
    });

    it.each([
      ['action', 'user.delete', '/admin/audit?action=user.delete', { action: 'user.delete' }],
      ['targetType', 'role', '/admin/audit?targetType=role', { targetType: 'role' }],
    ])('filters by %s, back to the first page', async (control, value, url, params) => {
      await answer(await open('/admin/audit?page=2'), [ASSIGN], 40);

      list.filterForm.controls[control].setValue(value);

      await urlBecomes(url);
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ page: '1', ...params });
      await answer(request);
    });

    it('sorts by date ascending on the first click, then back to the default descending', async () => {
      await answer(await open());

      click('th[mat-sort-header="createdAt"]');

      await urlBecomes('/admin/audit?sortOrder=asc');
      const ascending = listRequest();
      expect(paramsOf(ascending)).toMatchObject({ sortBy: 'createdAt', sortOrder: 'asc' });
      await answer(ascending);

      click('th[mat-sort-header="createdAt"]');

      await urlBecomes('/admin/audit');
      const descending = listRequest();
      expect(paramsOf(descending)).toMatchObject({ sortBy: 'createdAt', sortOrder: 'desc' });
      await answer(descending);
    });

    it('goes to the next page and keeps the rows while it loads', async () => {
      await answer(await open(), [ASSIGN, CLEANUP, CREATE], 45);

      click('.mat-mdc-paginator-navigation-next');

      await urlBecomes('/admin/audit?page=2');
      const request = listRequest();
      expect(paramsOf(request)).toMatchObject({ page: '2' });
      harness.fixture.detectChanges();
      expect(element().querySelectorAll('tr.mat-mdc-row')).toHaveLength(3);
      await answer(request, [ASSIGN], 45);
    });
  });

  describe('links to users and roles', () => {
    it('links actors and user or role targets with realm:admin', async () => {
      await answer(await open());

      expect(links()).toEqual([
        '/admin/audit/users/5',
        '/admin/audit/users/8',
        '/admin/audit/users/5',
        '/admin/audit/roles/3',
      ]);
    });

    it('shows plain ids without realm:admin', async () => {
      signIn(['realm:audit']);
      await answer(await open());

      expect(links()).toEqual([]);
      expect(text()).toContain('#5');
      expect(text()).toContain('#8');
    });
  });

  describe('empty list', () => {
    it('only says there is no entry when nothing is filtered', async () => {
      await answer(await open(), []);

      expect(text()).toContain(fr.admin.audit.empty);
      expect(text()).not.toContain(fr.common.emptyFiltered.reset);
    });

    it('offers to reset the filters, which brings back the base view', async () => {
      await answer(await open('/admin/audit?actorId=99&action=user.delete'), []);

      expect(text()).toContain(fr.common.emptyFiltered.hint);
      Array.from(element().querySelectorAll('button'))
        .find((button) => button.textContent!.includes(fr.common.emptyFiltered.reset))!
        .click();

      await urlBecomes('/admin/audit');
      await answer(listRequest());
    });
  });

  describe('action names', () => {
    it('offers every action translated in the filter', async () => {
      await answer(await open());

      const select = await TestbedHarnessEnvironment.loader(harness.fixture).getHarness(
        MatSelectHarness.with({ selector: '[formcontrolname="action"]' }),
      );
      await select.open();
      const options = await Promise.all((await select.getOptions()).map((o) => o.getText()));

      expect(options).toEqual([
        fr.admin.audit.filterActionAll,
        ...list.actions.map((action) => translation(fr.admin.audit.actions, action)),
      ]);
    });

    it('has an English name for every action', async () => {
      await answer(await open());

      const missing = list.actions.filter(
        (action) => typeof translation(en.admin.audit.actions, action) !== 'string',
      );
      expect(missing).toEqual([]);
    });
  });

  it('remembers the list URL for the way back from a detail page', async () => {
    await answer(await open('/admin/audit?actorId=5&page=2'), [ASSIGN], 30);

    expect(router.serializeUrl(TestBed.inject(UrlService).listLink('/admin/audit'))).toBe(
      '/admin/audit?actorId=5&page=2',
    );
  });
});
