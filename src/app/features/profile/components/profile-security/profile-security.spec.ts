import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { Router } from '@angular/router';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { ProfileSecurity } from './profile-security';

describe('ProfileSecurity', () => {
  let fixture: ComponentFixture<ProfileSecurity>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent!;
  const button = (label: string) => loader.getHarnessOrNull(MatButtonHarness.with({ text: label }));
  const saveButton = () => button(fr.me.profile.savePassword);
  const fieldErrors = async () =>
    Promise.all(
      (await loader.getAllHarnesses(MatFormFieldHarness)).map((field) => field.getTextErrors()),
    );

  // Opens the password edition with the pencil button
  async function edit() {
    await (await button('edit'))!.click();
  }

  // Types like a user, leaving each field so that its errors show
  async function fill(current: string, next: string, confirm = next) {
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    const values = [current, next, confirm];
    for (const [index, input] of inputs.entries()) {
      await input.setValue(values[index]);
      await input.blur();
    }
  }

  async function submit(current = 'old-secret-1', next = 'new-secret-1') {
    await edit();
    await fill(current, next);
    await (await saveButton())!.click();
  }

  async function failChange(status: number, body: object) {
    backend.expectOne('/profiles/me/password').flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('access_token', 'access-1');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProfileSecurity);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  it('shows a read-only password field until the user asks to edit it', async () => {
    const inputs = await loader.getAllHarnesses(MatInputHarness);
    expect(inputs).toHaveLength(1);
    expect(await inputs[0].isDisabled()).toBe(true);
    expect(await saveButton()).toBeNull();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('opens the three password fields with save disabled while empty', async () => {
    await edit();

    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(3);
    expect(await (await saveButton())!.isDisabled()).toBe(true);
  });

  it('shows required errors once the fields are left empty', async () => {
    await edit();
    await fill('', '');

    expect(await fieldErrors()).toEqual([
      [fr.me.profile.password.required],
      [fr.me.profile.password.newRequired],
      [fr.me.profile.password.confirmRequired],
    ]);
  });

  it('enforces the minimum length of the new password', async () => {
    await edit();
    await fill('old-secret-1', 'short');

    expect((await fieldErrors())[1]).toEqual([fr.me.profile.password.minlength]);
    expect(await (await saveButton())!.isDisabled()).toBe(true);
  });

  it('flags a confirmation that does not match, and clears it once fixed', async () => {
    await edit();
    await fill('old-secret-1', 'new-secret-1', 'new-secret-2');

    expect((await fieldErrors())[2]).toEqual([fr.me.profile.password.mismatch]);
    expect(await (await saveButton())!.isDisabled()).toBe(true);

    const confirm = (await loader.getAllHarnesses(MatInputHarness))[2];
    await confirm.setValue('new-secret-1');

    expect((await fieldErrors())[2]).toEqual([]);
    expect(await (await saveButton())!.isDisabled()).toBe(false);
  });

  it('also re-checks the match when the new password changes', async () => {
    await edit();
    await fill('old-secret-1', 'new-secret-1');

    const next = (await loader.getAllHarnesses(MatInputHarness))[1];
    await next.setValue('new-secret-9');

    expect((await fieldErrors())[2]).toEqual([fr.me.profile.password.mismatch]);
  });

  it('sends the current and new passwords and shows the success state', async () => {
    await submit();

    const request = backend.expectOne('/profiles/me/password');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      currentPassword: 'old-secret-1',
      newPassword: 'new-secret-1',
    });
    request.flush({ code: 'profile.password.changed' });
    await fixture.whenStable();

    expect(text()).toContain(fr.me.profile.passwordChanged.subtitle);
    expect(await saveButton()).toBeNull();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('disables save while the change is pending', async () => {
    await submit();

    expect(await (await saveButton())!.isDisabled()).toBe(true);

    await failChange(429, { code: 'throttle.too_many_requests', params: { retryAfter: 60 } });
    expect(await (await saveButton())!.isDisabled()).toBe(false);
  });

  it('logs out and goes to login when the countdown ends', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await submit();
    backend.expectOne('/profiles/me/password').flush({ code: 'profile.password.changed' });
    await fixture.whenStable();

    await vi.advanceTimersByTimeAsync(3000);
    await fixture.whenStable();
    expect(text()).toContain('7 seconde(s)');
    expect(navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(7000);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/', 'auth', 'login']);
  });

  it('logs out right away with the login button and stops the countdown', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await submit();
    backend.expectOne('/profiles/me/password').flush({ code: 'profile.password.changed' });
    await fixture.whenStable();

    await (await button(fr.me.profile.passwordChanged.loginLink))!.click();
    await vi.advanceTimersByTimeAsync(10000);

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/', 'auth', 'login']);
  });

  it('shows the wrong current password message and keeps the form', async () => {
    await submit();
    await failChange(401, { code: 'profile.password.incorrect' });

    expect(text()).toContain(fr.api.profile.password.incorrect);
    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(3);
    expect(localStorage.getItem('access_token')).toBe('access-1');
  });

  it('shows the throttle delay in minutes', async () => {
    await submit();
    await failChange(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    expect(text()).toContain('2 min');
  });

  it('shows server validation errors under the new password', async () => {
    await submit();
    await failChange(400, {
      code: 'validation.failed',
      params: { fields: [{ key: 'newPassword', code: 'validation.newPassword.matches' }] },
    });

    expect((await fieldErrors())[1]).toEqual([fr.validation.newPassword.matches]);
  });

  it('cancels the edition: back to read-only, values and error cleared', async () => {
    await submit();
    await failChange(401, { code: 'profile.password.incorrect' });

    await (await button(fr.me.profile.cancel))!.click();

    expect(await loader.getAllHarnesses(MatInputHarness)).toHaveLength(1);
    expect(text()).not.toContain(fr.api.profile.password.incorrect);
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    await edit();
    const values = await Promise.all(
      (await loader.getAllHarnesses(MatInputHarness)).map((input) => input.getValue()),
    );
    expect(values).toEqual(['', '', '']);
  });

  it('reports unsaved changes as soon as something is typed', async () => {
    await edit();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);

    await (await loader.getAllHarnesses(MatInputHarness))[0].setValue('o');

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('toggles the visibility of the current and new passwords', async () => {
    await edit();
    const [current, next, confirm] = await loader.getAllHarnesses(MatInputHarness);
    const toggles = await loader.getAllHarnesses(MatButtonHarness.with({ text: 'visibility' }));
    expect(toggles).toHaveLength(2);

    await toggles[0].click();
    await toggles[1].click();

    expect([await current.getType(), await next.getType(), await confirm.getType()]).toEqual([
      'text',
      'text',
      'password',
    ]);
  });
});
