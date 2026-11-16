import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { formatDate } from '@angular/common';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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
  const logoutAllButton = () =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: fr.me.sessions.logoutAll.button }));
  const dialog = () => document.querySelector<HTMLElement>('mat-dialog-container');
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

  async function answerDialog(confirm: boolean) {
    const [cancel, ok] = Array.from(dialog()!.querySelectorAll('button'));
    (confirm ? ok : cancel).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('access_token', 'access-1');
    localStorage.setItem('refresh_token', 'refresh-1');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SessionsList);
    loader = TestbedHarnessEnvironment.loader(fixture);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  it('loads every session, newest first, showing progress meanwhile', async () => {
    const request = listRequest();
    const params = request.request.params;
    expect(params.keys().map((key) => [key, params.get(key)])).toEqual([
      ['limit', '100'],
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
    fixture.detectChanges();
    expect(renderedRows()).toBe(2);
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

  it('shows no paginator', async () => {
    await answerList([session(1), session(2)]);

    expect(await loader.getHarnessOrNull(MatPaginatorHarness)).toBeNull();
  });

  describe('log out all sessions', () => {
    it('is offered only with at least two sessions', async () => {
      await answerList([session(1)]);
      expect(await logoutAllButton()).toBeNull();

      fixture.componentInstance.sessionsResource.reload();
      await answerList([session(1), session(2)]);
      expect(await logoutAllButton()).not.toBeNull();
    });

    it('sends nothing when the dialog is cancelled', async () => {
      await answerList([session(1), session(2)]);

      await (await logoutAllButton())!.click();
      expect(dialog()!.textContent).toContain(fr.me.sessions.logoutAll.title);
      await answerDialog(false);

      backend.expectNone('/auth/logout-all');
    });

    it('revokes every session, then signs out this device and goes to login', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await answerList([session(1), session(2)]);

      await (await logoutAllButton())!.click();
      await answerDialog(true);
      const request = backend.expectOne('/auth/logout-all');
      expect(request.request.method).toBe('POST');
      request.flush({ code: 'auth.logout_all.success' });

      backend.expectOne('/auth/logout').flush({ code: 'auth.logout.success' });
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('shows the error and stays on the page', async () => {
      await answerList([session(1), session(2)]);

      await (await logoutAllButton())!.click();
      await answerDialog(true);
      backend
        .expectOne('/auth/logout-all')
        .flush(
          { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
          { status: 429, statusText: 'Error' },
        );
      await fixture.whenStable();

      expect(text()).toContain('2 min');
      expect(localStorage.getItem('access_token')).toBe('access-1');
      expect(await (await logoutAllButton())!.isDisabled()).toBe(false);
    });
  });
});
