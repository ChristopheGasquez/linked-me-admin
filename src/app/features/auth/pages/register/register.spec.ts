import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatInputHarness } from '@angular/material/input/testing';

import { fr, provideTestDefaults } from '../../../../../testing/test-providers';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;

  const header = () =>
    (fixture.nativeElement as HTMLElement).querySelector('mat-card-header')!.textContent!;

  // Fills the form like a user and submits it
  async function submit(name = 'Jo', email = 'jo@test.dev', password = 'secret-123') {
    const [nameInput, emailInput, passwordInput] = await loader.getAllHarnesses(MatInputHarness);
    await nameInput.setValue(name);
    await emailInput.setValue(email);
    await passwordInput.setValue(password);
    await (await loader.getHarness(MatButtonHarness.with({ text: fr.auth.register.submit }))).click();
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

  it('shows the throttle delay in minutes', async () => {
    await submit();
    await failRegister(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    expect(header()).toContain('2 min');
  });
});
