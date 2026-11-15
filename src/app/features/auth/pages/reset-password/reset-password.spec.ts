import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { ResetPassword } from './reset-password';

describe('ResetPassword', () => {
  let harness: RouterTestingHarness;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const card = () => harness.routeNativeElement!;
  const header = () => card().querySelector('mat-card-header')!.textContent!;
  const submitButton = () =>
    loader.getHarness(MatButtonHarness.with({ text: fr.auth.resetPassword.submit }));
  const passwordErrors = async () => (await loader.getHarness(MatFormFieldHarness)).getTextErrors();

  // Opens the page the way the reset email link does
  async function open(url = '/reset-password?token=reset-token') {
    await harness.navigateByUrl(url, ResetPassword);
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
  }

  // Types the new password like a user and submits the form
  async function submit(password = 'new-secret-123') {
    await (await loader.getHarness(MatInputHarness)).setValue(password);
    await (await submitButton()).click();
  }

  // Answers the pending reset request with an API error
  async function failReset(status: number, body: object) {
    backend.expectOne('/auth/reset-password').flush(body, { status, statusText: 'Error' });
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([{ path: 'reset-password', component: ResetPassword }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  it('shows the invalid link state without a form when the token is missing', async () => {
    await open('/reset-password');

    expect(header()).toContain(fr.auth.resetPassword.error.title);
    expect(card().textContent).toContain(fr.api.auth.password_reset.invalid_token);
    expect(card().querySelector('form')).toBeNull();
  });

  it('shows the required error and sends nothing when submitted empty', async () => {
    await open();
    await submit('');

    expect(await passwordErrors()).toEqual([fr.auth.resetPassword.password.required]);
  });

  it('enforces the minimum length without calling the API', async () => {
    await open();
    await submit('short');

    expect(await passwordErrors()).toEqual([fr.auth.resetPassword.password.minlength]);
  });

  it('sends the token with the new password and shows the success state', async () => {
    await open();
    await submit();

    const request = backend.expectOne('/auth/reset-password');
    expect(request.request.body).toEqual({ token: 'reset-token', password: 'new-secret-123' });
    request.flush({ message: 'ok' });
    await harness.fixture.whenStable();

    expect(header()).toContain(fr.auth.resetPassword.success.title);
    expect(card().querySelector('form')).toBeNull();
  });

  it('counts down and redirects to the login page after success', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await open();
    await submit();
    backend.expectOne('/auth/reset-password').flush({ message: 'ok' });
    await harness.fixture.whenStable();

    await vi.advanceTimersByTimeAsync(3000);
    await harness.fixture.whenStable();
    expect(card().textContent).toContain('7 seconde(s)');
    expect(navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(7000);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/', 'auth', 'login']);
  });

  it('disables the submit button while resetting', async () => {
    await open();
    await submit();

    const button = await submitButton();
    expect(await button.isDisabled()).toBe(true);

    await failReset(429, { code: 'throttle.too_many_requests', params: { retryAfter: 60 } });
    expect(await button.isDisabled()).toBe(false);
  });

  it('switches to the invalid link state when the API rejects the token', async () => {
    await open();
    await submit();
    await failReset(401, { code: 'auth.password_reset.invalid_token' });

    expect(header()).toContain(fr.auth.resetPassword.error.title);
    expect(card().textContent).toContain(fr.api.auth.password_reset.invalid_token);
    expect(card().querySelector('form')).toBeNull();
  });

  it('shows server validation errors under the password field', async () => {
    await open();
    await submit();
    await failReset(400, {
      code: 'validation.failed',
      params: { fields: [{ key: 'password', code: 'validation.password.minLength' }] },
    });

    expect(await passwordErrors()).toEqual([fr.validation.password.minLength]);
  });

  it('toggles the password visibility', async () => {
    await open();
    const password = await loader.getHarness(MatInputHarness);
    expect(await password.getType()).toBe('password');

    await (await loader.getHarness(MatButtonHarness.with({ text: 'visibility' }))).click();

    expect(await password.getType()).toBe('text');
  });
});
