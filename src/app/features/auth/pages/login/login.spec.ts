import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { Router } from '@angular/router';

import { fr, provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { fakeTurnstile } from '../../../../../testing/turnstile-stub';
import { AppConfigService } from '../../../../core/services/app-config.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReturnUrlService } from '../../../../core/services/return-url.service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const header = () =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-card-header')!.textContent!;
  const submitButton = () =>
    loader.getHarness(MatButtonHarness.with({ text: fr.auth.login.submit }));
  const resendButton = () =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: fr.auth.login.resendEmail }));
  const fieldErrors = async () =>
    Promise.all(
      (await loader.getAllHarnesses(MatFormFieldHarness)).map((field) => field.getTextErrors()),
    );

  async function solveCaptcha(token = 'captcha-token') {
    fakeTurnstile().solve(token);
    await fixture.whenStable();
  }

  // Fills the form like a user, solves the captcha and submits it
  async function submit(email = 'jo@test.dev', password = 'secret') {
    const [emailInput, passwordInput] = await loader.getAllHarnesses(MatInputHarness);
    await emailInput.setValue(email);
    await passwordInput.setValue(password);
    await solveCaptcha();
    await (await submitButton()).click();
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
    expect(login.request.headers.get('X-Turnstile-Token')).toBe('captcha-token');
    login.flush({ user: {} });
    backend.expectOne('/auth/me').flush(testUser(['realm:profile']));
    await fixture.whenStable();

    expect(TestBed.inject(AuthService).currentUser()?.permissions).toEqual(['realm:profile']);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  describe('sent by another app', () => {
    let navigate: ReturnType<typeof vi.spyOn>;
    let go: ReturnType<typeof vi.spyOn>;

    async function signIn(returnUrl: string) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
      await submit();
      backend.expectOne('/auth/login').flush({ user: {} });
      backend.expectOne('/auth/me').flush(testUser());
      await fixture.whenStable();
    }

    beforeEach(() => {
      vi.spyOn(TestBed.inject(AppConfigService), 'returnUrlOrigins', 'get').mockReturnValue([
        'https://app.gasquez.fr',
      ]);
      navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      go = vi.spyOn(TestBed.inject(ReturnUrlService), 'go').mockImplementation(() => undefined);
    });

    it('goes back to an allowed app once signed in', async () => {
      await signIn('https://app.gasquez.fr/projects?id=1');

      expect(go).toHaveBeenCalledWith('https://app.gasquez.fr/projects?id=1');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('goes to the dashboard when the app is not allowed', async () => {
      await signIn('https://evil.com/');

      expect(go).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  it('explains a session interrupted by a replayed refresh token', async () => {
    TestBed.inject(AuthService).sessionInterrupted.set(true);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      fr.api.auth.refresh.token_reused,
    );
  });

  it('disables the submit button while signing in', async () => {
    await submit();

    expect(await (await submitButton()).isDisabled()).toBe(true);
    await failLogin(401, { code: 'auth.login.invalid_credentials' });
  });

  describe('captcha', () => {
    it('disables the submit button until the captcha is solved, and again once it expires', async () => {
      expect(await (await submitButton()).isDisabled()).toBe(true);

      await solveCaptcha();
      expect(await (await submitButton()).isDisabled()).toBe(false);

      fakeTurnstile().expire();
      await fixture.whenStable();
      expect(await (await submitButton()).isDisabled()).toBe(true);
    });

    it('resets the captcha after an error, then accepts a new token', async () => {
      await submit();
      await failLogin(401, { code: 'auth.login.invalid_credentials' });

      expect(fakeTurnstile().reset).toHaveBeenCalledTimes(1);
      expect(await (await submitButton()).isDisabled()).toBe(true);

      await solveCaptcha('captcha-token-2');
      expect(await (await submitButton()).isDisabled()).toBe(false);
    });

    it.each([
      [400, 'captcha.missing', fr.api.captcha.missing],
      [403, 'captcha.invalid', fr.api.captcha.invalid],
      [503, 'captcha.unavailable', fr.api.captcha.unavailable],
    ])('shows the captcha error (%s %s)', async (status, code, message) => {
      await submit();
      await failLogin(status, { code });

      expect(header()).toContain(message);
    });
  });

  it.each([
    [401, 'auth.login.invalid_credentials', fr.api.auth.login.invalid_credentials],
    [403, 'auth.login.account_locked', fr.api.auth.login.account_locked],
  ])('shows the API error message (%s %s)', async (status, code, message) => {
    await submit();
    await failLogin(status, { code });

    expect(header()).toContain(message);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(message);
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
    const toggle = await (
      await loader.getHarness(MatButtonHarness.with({ text: 'visibility' }))
    ).host();
    expect(await toggle.getAttribute('aria-label')).toBe(fr.common.showPassword);
    expect(await toggle.getAttribute('aria-pressed')).toBe('false');

    await toggle.click();

    expect(await password.getType()).toBe('text');
    expect(await toggle.getAttribute('aria-pressed')).toBe('true');
  });

  describe('resend verification email', () => {
    // The failed login resets the captcha: the resend needs a new token
    async function loginWithUnverifiedEmail() {
      await submit();
      await failLogin(401, { code: 'auth.login.email_not_verified' });
      await solveCaptcha('captcha-token-2');
    }

    it('confirms the email was sent and hides the button', async () => {
      await loginWithUnverifiedEmail();
      await (await resendButton())!.click();

      const request = backend.expectOne('/auth/resend-verification');
      expect(request.request.body).toEqual({
        email: 'jo@test.dev',
        callbackUrl: `${window.location.origin}/auth/email-confirmed`,
      });
      expect(request.request.headers.get('X-Turnstile-Token')).toBe('captcha-token-2');
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
      expect(fakeTurnstile().reset).toHaveBeenCalledTimes(2);
    });
  });
});
