import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { Router } from '@angular/router';

import { fr, provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { AuthService } from '../../../../core/services/auth.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const header = () =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-card-header')!.textContent!;
  const resendButton = () =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: fr.auth.login.resendEmail }));
  const fieldErrors = async () =>
    Promise.all(
      (await loader.getAllHarnesses(MatFormFieldHarness)).map((field) => field.getTextErrors()),
    );

  // Fills the form like a user and submits it
  async function submit(email = 'jo@test.dev', password = 'secret') {
    const [emailInput, passwordInput] = await loader.getAllHarnesses(MatInputHarness);
    await emailInput.setValue(email);
    await passwordInput.setValue(password);
    await (await loader.getHarness(MatButtonHarness.with({ text: fr.auth.login.submit }))).click();
  }

  // Answers the pending login request with an API error
  async function failLogin(status: number, body: object) {
    backend.expectOne('/auth/login').flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  it('shows required errors and sends nothing when submitted empty', async () => {
    await submit('', '');

    expect(await fieldErrors()).toEqual([
      [fr.auth.login.email.required],
      [fr.auth.login.password.required],
    ]);
  });

  it('rejects a malformed email without calling the API', async () => {
    await submit('not-an-email');

    expect((await fieldErrors())[0]).toEqual([fr.auth.login.email.invalid]);
  });

  it('signs in, loads the user and goes to the dashboard', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await submit();

    const login = backend.expectOne('/auth/login');
    expect(login.request.body).toEqual({ email: 'jo@test.dev', password: 'secret' });
    login.flush({ access_token: 'access-1', refresh_token: 'refresh-1', user: {} });
    backend.expectOne('/auth/me').flush(testUser(['realm:profile']));
    await fixture.whenStable();

    expect(localStorage.getItem('access_token')).toBe('access-1');
    expect(TestBed.inject(AuthService).currentUser()?.permissions).toEqual(['realm:profile']);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('disables the submit button while signing in', async () => {
    await submit();

    const button = await loader.getHarness(MatButtonHarness.with({ text: fr.auth.login.submit }));
    expect(await button.isDisabled()).toBe(true);

    await failLogin(401, { code: 'auth.login.invalid_credentials' });
    expect(await button.isDisabled()).toBe(false);
  });

  it.each([
    [401, 'auth.login.invalid_credentials', fr.api.auth.login.invalid_credentials],
    [403, 'auth.login.account_locked', fr.api.auth.login.account_locked],
  ])('shows the API error message (%s %s)', async (status, code, message) => {
    await submit();
    await failLogin(status, { code });

    expect(header()).toContain(message);
    expect(await resendButton()).toBeNull();
  });

  it('shows the throttle delay in minutes', async () => {
    await submit();
    await failLogin(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    expect(header()).toContain('2 min');
  });

  it('shows server validation errors under the fields', async () => {
    await submit();
    await failLogin(400, {
      code: 'validation.failed',
      params: { fields: [{ key: 'email', code: 'validation.email.isEmail' }] },
    });

    expect((await fieldErrors())[0]).toEqual([fr.validation.email.isEmail]);
  });

  it('toggles the password visibility', async () => {
    const password = (await loader.getAllHarnesses(MatInputHarness))[1];
    expect(await password.getType()).toBe('password');

    await (await loader.getHarness(MatButtonHarness.with({ text: 'visibility' }))).click();

    expect(await password.getType()).toBe('text');
  });

  describe('resend verification email', () => {
    async function loginWithUnverifiedEmail() {
      await submit();
      await failLogin(401, { code: 'auth.login.email_not_verified' });
    }

    it('confirms the email was sent and hides the button', async () => {
      await loginWithUnverifiedEmail();
      await (await resendButton())!.click();

      const request = backend.expectOne('/auth/resend-verification');
      expect(request.request.body).toEqual({
        email: 'jo@test.dev',
        callbackUrl: `${window.location.origin}/auth/email-confirmed`,
      });
      request.flush({ message: 'sent', code: 'auth.email.resend_sent' });
      await fixture.whenStable();

      expect(header()).toContain(fr.api.auth.email.resend_sent);
      expect(await resendButton()).toBeNull();
    });

    it('shows the error and keeps the button to retry', async () => {
      await loginWithUnverifiedEmail();
      await (await resendButton())!.click();

      backend
        .expectOne('/auth/resend-verification')
        .flush(
          { code: 'throttle.too_many_requests', params: { retryAfter: 120 } },
          { status: 429, statusText: 'Too Many Requests' },
        );
      await fixture.whenStable();

      expect(header()).toContain('2 min');
      expect(await resendButton()).not.toBeNull();
    });
  });
});
