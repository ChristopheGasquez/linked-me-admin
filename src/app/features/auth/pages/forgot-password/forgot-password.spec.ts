import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { fakeTurnstile } from '../../../../../testing/turnstile-stub';
import { ForgotPassword } from './forgot-password';

describe('ForgotPassword', () => {
  let fixture: ComponentFixture<ForgotPassword>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const card = () => fixture.nativeElement as HTMLElement;
  const header = () => card().querySelector('mat-card-header')!.textContent!;
  const submitButton = () =>
    loader.getHarness(MatButtonHarness.with({ text: fr.auth.forgotPassword.submit }));
  const emailErrors = async () => (await loader.getHarness(MatFormFieldHarness)).getTextErrors();

  async function solveCaptcha(token = 'captcha-token') {
    fakeTurnstile().solve(token);
    await fixture.whenStable();
  }

  // Fills the email like a user, solves the captcha and submits the form
  async function submit(email = 'jo@test.dev') {
    await (await loader.getHarness(MatInputHarness)).setValue(email);
    await solveCaptcha();
    await (await submitButton()).click();
  }

  // Answers the pending forgot-password request with an API error
  async function failRequest(status: number, body: object) {
    backend.expectOne('/auth/forgot-password').flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ForgotPassword);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  it('shows the required error and sends nothing when submitted empty', async () => {
    await submit('');

    expect(await emailErrors()).toEqual([fr.auth.forgotPassword.email.required]);
  });

  it('rejects an invalid email without calling the API', async () => {
    await submit('not-an-email');

    expect(await emailErrors()).toEqual([fr.auth.forgotPassword.email.invalid]);
  });

  it('sends the reset link request and shows the success state', async () => {
    await submit();

    const request = backend.expectOne('/auth/forgot-password');
    expect(request.request.body).toEqual({
      email: 'jo@test.dev',
      callbackUrl: `${window.location.origin}/auth/reset-password`,
    });
    expect(request.request.headers.get('X-Turnstile-Token')).toBe('captcha-token');
    request.flush({ message: 'ok' });
    await fixture.whenStable();

    expect(header()).toContain(fr.auth.forgotPassword.success.title);
    expect(card().textContent).toContain(fr.auth.forgotPassword.success.subtitle);
    expect(card().querySelector('form')).toBeNull();
  });

  it('disables the submit button while sending', async () => {
    await submit();

    expect(await (await submitButton()).isDisabled()).toBe(true);
    await failRequest(429, { code: 'throttle.too_many_requests', params: { retryAfter: 60 } });
  });

  it('disables the submit button until the captcha is solved', async () => {
    expect(await (await submitButton()).isDisabled()).toBe(true);

    await solveCaptcha();

    expect(await (await submitButton()).isDisabled()).toBe(false);
  });

  it('resets the captcha after an error', async () => {
    await submit();
    await failRequest(503, { code: 'captcha.unavailable' });

    expect(header()).toContain(fr.api.captcha.unavailable);
    expect(fakeTurnstile().reset).toHaveBeenCalledTimes(1);
    expect(await (await submitButton()).isDisabled()).toBe(true);
  });

  it('shows the throttle delay in minutes and keeps the form', async () => {
    await submit();
    await failRequest(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    expect(header()).toContain('2 min');
    expect(card().querySelector('form')).not.toBeNull();
  });

  it('shows server validation errors under the email field', async () => {
    await submit();
    await failRequest(400, {
      code: 'validation.failed',
      params: { fields: [{ key: 'email', code: 'validation.email.isEmail' }] },
    });

    expect(await emailErrors()).toEqual([fr.validation.email.isEmail]);
  });
});
