import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const header = () =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-card-header')!.textContent!;
  const resendButton = () =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: fr.auth.login.resendEmail }));

  // Submits valid credentials for an account whose email is not verified
  async function loginWithUnverifiedEmail() {
    const [email, password] = await loader.getAllHarnesses(MatInputHarness);
    await email.setValue('jo@test.dev');
    await password.setValue('secret');
    await (await loader.getHarness(MatButtonHarness.with({ text: fr.auth.login.submit }))).click();
    backend
      .expectOne('/auth/login')
      .flush(
        { code: 'auth.login.email_not_verified' },
        { status: 401, statusText: 'Unauthorized' },
      );
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

  describe('resend verification email', () => {
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
