import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { Router } from '@angular/router';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { fakeTurnstile } from '../../../../../testing/turnstile-stub';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const header = () =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-card-header')!.textContent!;
  const submitButton = () =>
    loader.getHarness(MatButtonHarness.with({ text: fr.auth.register.submit }));
  const fieldErrors = async () =>
    Promise.all(
      (await loader.getAllHarnesses(MatFormFieldHarness)).map((field) => field.getTextErrors()),
    );

  async function solveCaptcha(token = 'captcha-token') {
    fakeTurnstile().solve(token);
    await fixture.whenStable();
  }

  // Fills the form like a user, solves the captcha and submits it
  async function submit(name = 'Jo', email = 'jo@test.dev', password = 'secret-123') {
    const [nameInput, emailInput, passwordInput] = await loader.getAllHarnesses(MatInputHarness);
    await nameInput.setValue(name);
    await emailInput.setValue(email);
    await passwordInput.setValue(password);
    await solveCaptcha();
    await (await submitButton()).click();
  }

  // Answers the pending register request with an API error
  async function failRegister(status: number, body: object) {
    backend.expectOne('/auth/register').flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Register);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  it('shows required errors and sends nothing when submitted empty', async () => {
    await submit('', '', '');

    expect(await fieldErrors()).toEqual([
      [fr.auth.register.name.required],
      [fr.auth.register.email.required],
      [fr.auth.register.password.required],
    ]);
  });

  it('enforces the minimum lengths and the email format without calling the API', async () => {
    await submit('J', 'not-an-email', 'short');

    expect(await fieldErrors()).toEqual([
      [fr.auth.register.name.minlength],
      [fr.auth.register.email.invalid],
      [fr.auth.register.password.minlength],
    ]);
  });

  it('creates the account and goes to the verify-email page', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await submit();

    const request = backend.expectOne('/auth/register');
    expect(request.request.body).toEqual({
      name: 'Jo',
      email: 'jo@test.dev',
      password: 'secret-123',
      callbackUrl: `${window.location.origin}/auth/email-confirmed`,
    });
    expect(request.request.headers.get('X-Turnstile-Token')).toBe('captcha-token');
    request.flush({ id: 1 });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/', 'auth', 'verify-email'], {
      queryParams: { email: 'jo@test.dev' },
    });
  });

  it('disables the submit button while registering', async () => {
    await submit();

    expect(await (await submitButton()).isDisabled()).toBe(true);
    await failRegister(409, { code: 'auth.register.conflict' });
  });

  it('disables the submit button until the captcha is solved', async () => {
    expect(await (await submitButton()).isDisabled()).toBe(true);

    await solveCaptcha();

    expect(await (await submitButton()).isDisabled()).toBe(false);
  });

  it('resets the captcha after an error', async () => {
    await submit();
    await failRegister(409, { code: 'auth.register.conflict' });

    expect(fakeTurnstile().reset).toHaveBeenCalledTimes(1);
    expect(await (await submitButton()).isDisabled()).toBe(true);
  });

  it('shows the conflict message when the email is taken', async () => {
    await submit();
    await failRegister(409, { code: 'auth.register.conflict' });

    expect(header()).toContain(fr.api.auth.register.conflict);
  });

  it('shows the throttle delay in minutes', async () => {
    await submit();
    await failRegister(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    expect(header()).toContain('2 min');
  });

  it('shows server validation errors under the fields', async () => {
    await submit();
    await failRegister(400, {
      code: 'validation.failed',
      params: { fields: [{ key: 'email', code: 'validation.email.isEmail' }] },
    });

    expect((await fieldErrors())[1]).toEqual([fr.validation.email.isEmail]);
  });

  it('toggles the password visibility', async () => {
    const password = (await loader.getAllHarnesses(MatInputHarness))[2];
    expect(await password.getType()).toBe('password');

    await (await loader.getHarness(MatButtonHarness.with({ text: 'visibility' }))).click();

    expect(await password.getType()).toBe('text');
  });
});
