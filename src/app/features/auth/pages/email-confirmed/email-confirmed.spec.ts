import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { EmailConfirmed } from './email-confirmed';

describe('EmailConfirmed', () => {
  let harness: RouterTestingHarness;
  let backend: HttpTestingController;

  const card = () => harness.routeNativeElement!;
  const header = () => card().querySelector('mat-card-header')!.textContent!;
  const loginLink = () => card().querySelector('mat-card-actions a');

  // Opens the page the way the confirmation email link does
  async function open(url = '/email-confirmed?token=verify-token') {
    await harness.navigateByUrl(url, EmailConfirmed);
  }

  const verifyRequest = (): TestRequest =>
    backend.expectOne((request) => request.url === '/auth/verify-email');

  // Answers the pending verification with the given response
  async function answer(body: object, status = 200) {
    verifyRequest().flush(body, { status, statusText: status === 200 ? 'OK' : 'Error' });
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([{ path: 'email-confirmed', component: EmailConfirmed }]),
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  it('shows the invalid link state without calling the API when the token is missing', async () => {
    await open('/email-confirmed');

    expect(header()).toContain(fr.auth.emailConfirmed.error.title);
    expect(card().textContent).toContain(fr.api.auth.email.invalid_token);
    expect(loginLink()).not.toBeNull();
  });

  it('verifies the token and shows the loading state meanwhile', async () => {
    await open();

    const request = verifyRequest();
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('token')).toBe('verify-token');
    expect(header()).toContain(fr.auth.emailConfirmed.loading.title);
    expect(loginLink()).toBeNull();

    request.flush({ message: 'ok' });
  });

  it('shows the success state once the email is verified', async () => {
    await open();
    await answer({ message: 'ok' });

    expect(header()).toContain(fr.auth.emailConfirmed.success.title);
    expect(card().textContent).toContain(fr.auth.emailConfirmed.success.subtitle);
    expect(loginLink()).not.toBeNull();
  });

  it('counts down and redirects to the login page after success', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await open();
    await answer({ message: 'ok' });

    await vi.advanceTimersByTimeAsync(3000);
    await harness.fixture.whenStable();
    expect(card().textContent).toContain('7 seconde(s)');
    expect(navigate).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(7000);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/', 'auth', 'login']);
  });

  it('shows the expired link message from the API and does not redirect', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await open();
    await answer({ code: 'auth.email.invalid_token' }, 400);

    expect(header()).toContain(fr.auth.emailConfirmed.error.title);
    expect(card().textContent).toContain(fr.api.auth.email.invalid_token);

    await vi.advanceTimersByTimeAsync(10000);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the throttle delay in minutes', async () => {
    await open();
    await answer({ code: 'throttle.too_many_requests', params: { retryAfter: 120 } }, 429);

    expect(card().textContent).toContain('2 min');
  });
});
