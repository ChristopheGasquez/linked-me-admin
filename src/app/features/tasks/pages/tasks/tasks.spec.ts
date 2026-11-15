import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatChipHarness } from '@angular/material/chips/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { fr, provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { Tasks } from './tasks';

const ALL_TASKS = [
  'task:clean-users',
  'task:clean-tokens',
  'task:clean-audit',
  'task:clean-permissions',
];
// Card order on the page
const USERS = 1;
const TOKENS = 2;
const AUDIT = 3;
const ORPHANS = 4;

// Fills a translation like Transloco does
const message = (template: string, params: Record<string, string | number>) =>
  Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{{ ${key} }}`, String(value)),
    template,
  );

describe('Tasks', () => {
  let fixture: ComponentFixture<Tasks>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const card = (n: number) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      `mat-card:nth-of-type(${n})`,
    )!;
  const cardLoader = (n: number) => loader.getChildLoader(`mat-card:nth-of-type(${n})`);
  const runButton = async (n: number) => (await cardLoader(n)).getHarnessOrNull(MatButtonHarness);
  const dialog = () => document.querySelector<HTMLElement>('mat-dialog-container');
  const daysInput = async () => (await cardLoader(AUDIT)).getHarness(MatInputHarness);
  const daysField = async () => (await cardLoader(AUDIT)).getHarness(MatFormFieldHarness);

  async function answerDialog(confirm: boolean) {
    const [cancel, ok] = Array.from(dialog()!.querySelectorAll('button'));
    (confirm ? ok : cancel).click();
    await fixture.whenStable();
  }

  async function answer(task: string, body: object, status = 200) {
    backend
      .expectOne(`/tasks/cleanup-${task}`)
      .flush(body, { status, statusText: status === 200 ? 'OK' : 'Error' });
    await fixture.whenStable();
  }

  async function render(permissions = ALL_TASKS) {
    localStorage.setItem('access_token', 'access-1');
    TestBed.inject(AuthService).currentUser.set(testUser(['realm:task', ...permissions]));
    fixture = TestBed.createComponent(Tasks);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('shows the four tasks with their schedule', async () => {
    await render();

    const items = fr.admin.tasks.items;
    const titles = [USERS, TOKENS, AUDIT, ORPHANS].map((n) =>
      card(n).querySelector('mat-card-title')!.textContent!.trim(),
    );
    expect(titles).toEqual([
      items.unverifiedUsers.title,
      items.expiredTokens.title,
      items.auditLogs.title,
      items.orphanedPermissions.title,
    ]);
    expect(card(AUDIT).textContent).toContain(items.auditLogs.schedule);
  });

  it('offers to run only the tasks the user is allowed to', async () => {
    await render(['task:clean-tokens', 'task:clean-audit']);

    expect([
      !!(await runButton(USERS)),
      !!(await runButton(TOKENS)),
      !!(await runButton(AUDIT)),
      !!(await runButton(ORPHANS)),
    ]).toEqual([false, true, true, false]);
  });

  it('runs the expired tokens cleanup right away and shows what was deleted', async () => {
    await render();

    await (await runButton(TOKENS))!.click();
    expect(dialog()).toBeNull();
    const request = backend.expectOne('/tasks/cleanup-expired-tokens');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    expect(await (await runButton(TOKENS))!.isDisabled()).toBe(true);

    request.flush({
      code: 'task.cleanup.expired_tokens.done',
      params: { count: 8, refreshTokens: 6, passwordResets: 2 },
    });
    await fixture.whenStable();

    expect(card(TOKENS).textContent).toContain(
      message(fr.api.task.cleanup.expired_tokens.done, {
        count: 8,
        refreshTokens: 6,
        passwordResets: 2,
      }),
    );
    expect(await (await runButton(TOKENS))!.isDisabled()).toBe(false);
  });

  it('asks before deleting unverified accounts and does nothing when cancelled', async () => {
    await render();

    await (await runButton(USERS))!.click();
    expect(dialog()!.textContent).toContain(fr.admin.tasks.items.unverifiedUsers.confirm);
    await answerDialog(false);

    expect(card(USERS).querySelector('[role="status"]')).toBeNull();
  });

  it('deletes unverified accounts once confirmed', async () => {
    await render();

    await (await runButton(USERS))!.click();
    await answerDialog(true);
    await answer('unverified-users', {
      code: 'task.cleanup.unverified_users.done',
      params: { count: 5 },
    });

    expect(card(USERS).textContent).toContain(
      message(fr.api.task.cleanup.unverified_users.done, { count: 5 }),
    );
  });

  it('says there was nothing to clean when the count is zero', async () => {
    await render();

    await (await runButton(TOKENS))!.click();
    await answer('expired-tokens', {
      code: 'task.cleanup.expired_tokens.done',
      params: { count: 0, refreshTokens: 0, passwordResets: 0 },
    });

    expect(card(TOKENS).textContent).toContain(fr.admin.tasks.nothingToClean);
  });

  it('deletes audit logs older than the chosen number of days', async () => {
    await render();
    await (await daysInput()).setValue('90');

    await (await runButton(AUDIT))!.click();
    expect(dialog()!.textContent).toContain(
      message(fr.admin.tasks.items.auditLogs.confirm, { days: 90 }),
    );
    await answerDialog(true);

    const request = backend.expectOne('/tasks/cleanup-audit-logs');
    expect(request.request.body).toEqual({ olderThanDays: 90 });
    request.flush({
      code: 'task.cleanup.audit_logs.done',
      params: { count: 120, olderThanDays: 90 },
    });
    await fixture.whenStable();

    expect(card(AUDIT).textContent).toContain(
      message(fr.api.task.cleanup.audit_logs.done, { count: 120 }),
    );
  });

  it('keeps 30 days by default', async () => {
    await render();

    expect(await (await daysInput()).getValue()).toBe('30');
  });

  it.each([
    ['', fr.admin.tasks.items.auditLogs.daysRequired],
    ['0', fr.admin.tasks.items.auditLogs.daysMin],
    ['1.5', fr.admin.tasks.items.auditLogs.daysInteger],
  ])('refuses %j days with "%s"', async (days, error) => {
    await render();
    const input = await daysInput();
    await input.setValue(days);
    await input.blur();

    expect(await (await daysField()).getTextErrors()).toEqual([error]);
    expect(await (await runButton(AUDIT))!.isDisabled()).toBe(true);
  });

  it('warns but allows less than a week of logs', async () => {
    await render();
    await (await daysInput()).setValue('3');

    expect(await (await daysField()).getTextHints()).toEqual([
      fr.admin.tasks.items.auditLogs.daysWarning,
    ]);
    expect(await (await runButton(AUDIT))!.isDisabled()).toBe(false);
  });

  it('lists the orphaned permissions that were deleted', async () => {
    await render();

    await (await runButton(ORPHANS))!.click();
    await answerDialog(true);
    await answer('orphaned-permissions', {
      code: 'task.cleanup.orphaned_permissions.done',
      params: { count: 2, deleted: ['old:read', 'old:write'] },
    });

    expect(card(ORPHANS).textContent).toContain(
      message(fr.api.task.cleanup.orphaned_permissions.done, { count: 2 }),
    );
    const chips = await (await cardLoader(ORPHANS)).getAllHarnesses(MatChipHarness);
    expect(await Promise.all(chips.map((chip) => chip.getText()))).toEqual([
      'old:read',
      'old:write',
    ]);
  });

  it('says when no orphaned permission was found', async () => {
    await render();

    await (await runButton(ORPHANS))!.click();
    await answerDialog(true);
    await answer('orphaned-permissions', {
      code: 'task.cleanup.orphaned_permissions.none_found',
      params: { count: 0, deleted: [] },
    });

    expect(card(ORPHANS).textContent).toContain(
      fr.api.task.cleanup.orphaned_permissions.none_found,
    );
  });

  it('shows the error in the card and lets the task be run again', async () => {
    await render();

    await (await runButton(TOKENS))!.click();
    await answer(
      'expired-tokens',
      { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
      429,
    );

    expect(card(TOKENS).textContent).toContain('2 min');
    expect(await (await runButton(TOKENS))!.isDisabled()).toBe(false);
  });

  it('runs each task independently', async () => {
    await render();

    await (await runButton(TOKENS))!.click();

    expect(await (await runButton(TOKENS))!.isDisabled()).toBe(true);
    expect(await (await runButton(USERS))!.isDisabled()).toBe(false);
    await answer('expired-tokens', {
      code: 'task.cleanup.expired_tokens.done',
      params: { count: 1, refreshTokens: 1, passwordResets: 0 },
    });
  });
});
