import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { formatDate } from '@angular/common';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatTableHarness } from '@angular/material/table/testing';

import { SessionResponse } from '../../../../shared/models/session.model';
import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { SessionsList } from './sessions-list';

const session = (id: number): SessionResponse => ({
  id,
  userId: 1,
  createdAt: `2026-11-0${id}T08:30:00.000Z`,
  expiresAt: `2026-11-1${id}T08:30:00.000Z`,
});

describe('SessionsList', () => {
  let fixture: ComponentFixture<SessionsList>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent!;
  const rows = async () =>
    (await loader.getHarnessOrNull(MatTableHarness))?.getCellTextByIndex() ?? [];
  const disconnectButtons = () =>
    loader.getAllHarnesses(MatButtonHarness.with({ text: fr.me.sessions.disconnect }));
  // While the resource loads the app is not stable, so harnesses would wait: read the DOM instead
  const isLoading = () =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-progress-bar') !== null;
  const renderedRows = () =>
    (fixture.nativeElement as HTMLElement).querySelectorAll('tr.mat-mdc-row').length;

  function listRequest(): TestRequest {
    TestBed.tick();
    return backend.expectOne((request) => request.url === '/auth/sessions');
  }

  // Answers the pending list request with these sessions
  async function answerList(sessions: SessionResponse[], total = sessions.length) {
    listRequest().flush({ data: sessions, meta: { total, page: 1, limit: 10, totalPages: 1 } });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('access_token', 'access-1');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SessionsList);
    loader = TestbedHarnessEnvironment.loader(fixture);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  it('loads the first page of sessions, newest first, showing progress meanwhile', async () => {
    const request = listRequest();
    const params = request.request.params;
    expect(params.keys().map((key) => [key, params.get(key)])).toEqual([
      ['page', '1'],
      ['limit', '10'],
      ['sortBy', 'createdAt'],
      ['sortOrder', 'desc'],
    ]);
    expect(isLoading()).toBe(true);

    request.flush({ data: [session(1)], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } });
    await fixture.whenStable();

    expect(isLoading()).toBe(false);
  });

  it('shows one row per session with its dates', async () => {
    await answerList([session(1), session(2)]);

    const format = (date: string) => formatDate(date, fr.common.dateTimeFormat, 'en-US');
    expect(await rows()).toEqual([
      [format(session(1).createdAt), format(session(1).expiresAt), fr.me.sessions.disconnect],
      [format(session(2).createdAt), format(session(2).expiresAt), fr.me.sessions.disconnect],
    ]);
  });

  it('shows the empty state when there is no session', async () => {
    await answerList([]);

    expect(text()).toContain(fr.me.sessions.empty);
    expect(await loader.getHarnessOrNull(MatTableHarness)).toBeNull();
  });

  it('shows the API error when the list cannot be loaded', async () => {
    listRequest().flush(
      { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
      { status: 429, statusText: 'Error' },
    );
    await fixture.whenStable();

    expect(text()).toContain('2 min');
    expect(text()).not.toContain(fr.me.sessions.empty);
  });

  it('revokes a session, disabling its button meanwhile, then reloads the list', async () => {
    await answerList([session(1), session(2)]);

    await (await disconnectButtons())[1].click();
    const revoke = backend.expectOne('/auth/sessions/2');
    expect(revoke.request.method).toBe('DELETE');
    const [first, second] = await disconnectButtons();
    expect([await first.isDisabled(), await second.isDisabled()]).toEqual([false, true]);

    revoke.flush({ code: 'auth.session.revoked' });
    await answerList([session(1)]);

    expect(await rows()).toHaveLength(1);
  });

  it('shows the revoke error and keeps the list', async () => {
    await answerList([session(1), session(2)]);

    await (await disconnectButtons())[0].click();
    backend
      .expectOne('/auth/sessions/1')
      .flush({ code: 'auth.session.not_found' }, { status: 404, statusText: 'Error' });
    await fixture.whenStable();

    expect(text()).toContain(fr.api.auth.session.not_found);
    expect(await rows()).toHaveLength(2);
    expect(await (await disconnectButtons())[0].isDisabled()).toBe(false);
  });

  it('loads the next page and keeps the current rows while it loads', async () => {
    await answerList([session(1), session(2)], 12);

    const paginator = await loader.getHarness(MatPaginatorHarness);
    expect(await paginator.getRangeLabel()).toContain('12');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.mat-mdc-paginator-navigation-next')!
      .click();

    const request = listRequest();
    expect(request.request.params.get('page')).toBe('2');
    fixture.detectChanges();
    expect(renderedRows()).toBe(2);

    request.flush({ data: [session(3)], meta: { total: 12, page: 2, limit: 10, totalPages: 2 } });
    await fixture.whenStable();
    expect(await rows()).toHaveLength(1);
  });
});
