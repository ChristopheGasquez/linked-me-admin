import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { VerifyEmail } from './verify-email';

describe('VerifyEmail', () => {
  let harness: RouterTestingHarness;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const header = () => harness.routeNativeElement!.querySelector('mat-card-header')!.textContent!;
  const resendButton = () =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: fr.auth.verifyEmail.resend }));
  const backToLogin = () =>
    loader.getHarnessOrNull(MatButtonHarness.with({ text: fr.auth.verifyEmail.backToLogin }));

  // Opens the page the way register redirects to it
  async function open(url = '/verify-email?email=jo%40test.dev') {
    await harness.navigateByUrl(url, VerifyEmail);
    loader = TestbedHarnessEnvironment.loader(harness.fixture);
  }

  // Clicks resend and answers the request with the given response
  async function resend(body: object, status = 200) {
    await (await resendButton())!.click();
    backend
      .expectOne('/auth/resend-verification')
      .flush(body, { status, statusText: status === 200 ? 'OK' : 'Error' });
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([{ path: 'verify-email', component: VerifyEmail }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => backend.verify());

  it('offers only the way back to login when the email is missing', async () => {
    await open('/verify-email');

    expect(await resendButton()).toBeNull();
    expect(await backToLogin()).not.toBeNull();
  });

  it('resends the verification email to the address from the url', async () => {
    await open();
    await (await resendButton())!.click();

    const request = backend.expectOne('/auth/resend-verification');
    expect(request.request.body).toEqual({
      email: 'jo@test.dev',
      callbackUrl: `${window.location.origin}/auth/email-confirmed`,
    });
    request.flush({ code: 'auth.email.resend_sent' });
  });

  it('disables the resend button while sending', async () => {
    await open();
    const button = (await resendButton())!;
    await button.click();

    expect(await button.isDisabled()).toBe(true);

    backend.expectOne('/auth/resend-verification').flush({ code: 'auth.email.resend_sent' });
  });

  it('confirms the email was sent and hides the resend button', async () => {
    await open();
    await resend({ code: 'auth.email.resend_sent' });

    expect(header()).toContain(fr.api.auth.email.resend_sent);
    expect(await resendButton()).toBeNull();
    expect(await backToLogin()).not.toBeNull();
  });

  it('shows the throttle delay in minutes and lets the user retry', async () => {
    await open();
    await resend({ code: 'throttle.too_many_requests', params: { retryAfter: 120 } }, 429);

    expect(header()).toContain('2 min');
    expect(await (await resendButton())!.isDisabled()).toBe(false);

    await resend({ code: 'auth.email.resend_sent' });

    expect(header()).toContain(fr.api.auth.email.resend_sent);
    expect(header()).not.toContain('2 min');
    expect(await resendButton()).toBeNull();
  });
});
