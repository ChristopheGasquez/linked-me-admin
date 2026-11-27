import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputHarness } from '@angular/material/input/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { fr, provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { ProfileInfo } from './profile-info';

describe('ProfileInfo', () => {
  let fixture: ComponentFixture<ProfileInfo>;
  let loader: HarnessLoader;
  let backend: HttpTestingController;
  let authService: AuthService;

  const text = () => (fixture.nativeElement as HTMLElement).textContent!;
  const button = (label: string) => loader.getHarnessOrNull(MatButtonHarness.with({ text: label }));
  const saveButton = () => button(fr.me.profile.saveInfo);
  const nameInput = () => loader.getHarness(MatInputHarness);
  const nameErrors = async () => (await loader.getHarness(MatFormFieldHarness)).getTextErrors();

  async function rename(name: string) {
    await (await button('edit'))!.click();
    const input = await nameInput();
    await input.setValue(name);
    await input.blur();
  }

  async function submit(name = 'Jo Doe') {
    await rename(name);
    await (await saveButton())!.click();
  }

  async function failUpdate(status: number, body: object) {
    backend.expectOne('/profiles/me').flush(body, { status, statusText: 'Error' });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    backend = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    authService.currentUser.set(testUser(['realm:profile']));
    fixture = TestBed.createComponent(ProfileInfo);
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  afterEach(() => backend.verify());

  it('shows the current name read-only until the user asks to edit it', async () => {
    const input = await nameInput();
    expect(await input.getValue()).toBe('Admin');
    expect(await input.isDisabled()).toBe(true);
    expect(await saveButton()).toBeNull();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('keeps save disabled while the name is unchanged', async () => {
    await (await button('edit'))!.click();

    expect(await (await nameInput()).isDisabled()).toBe(false);
    expect(await (await saveButton())!.isDisabled()).toBe(true);
  });

  it('shows the required and minimum length errors', async () => {
    await rename('');
    expect(await nameErrors()).toEqual([fr.me.profile.name.required]);

    await (await nameInput()).setValue('J');
    expect(await nameErrors()).toEqual([fr.me.profile.name.minlength]);
    expect(await (await saveButton())!.isDisabled()).toBe(true);
  });

  it('shows the maximum length error', async () => {
    await rename('J'.repeat(101));

    expect(await nameErrors()).toEqual([fr.me.profile.name.maxlength]);
    expect(await (await saveButton())!.isDisabled()).toBe(true);
  });

  it('saves the new name, updates the signed-in user and goes back to read-only', async () => {
    await submit();

    const request = backend.expectOne('/profiles/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Jo Doe' });
    request.flush({ ...testUser(), name: 'Jo Doe' });
    await fixture.whenStable();

    const input = await nameInput();
    expect(await input.getValue()).toBe('Jo Doe');
    expect(await input.isDisabled()).toBe(true);
    expect(authService.currentUser()!.name).toBe('Jo Doe');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('shows the success message after saving the name', async () => {
    await submit();
    backend.expectOne('/profiles/me').flush({ ...testUser(), name: 'Jo Doe' });
    await fixture.whenStable();

    expect(text()).toContain(fr.me.profile.nameSuccess);

    await (await button('edit'))!.click();
    expect(text()).not.toContain(fr.me.profile.nameSuccess);
  });

  it('disables save while saving', async () => {
    await submit();

    expect(await (await saveButton())!.isDisabled()).toBe(true);

    await failUpdate(429, { code: 'throttle.too_many_requests', params: { retryAfter: 60 } });
    expect(await (await saveButton())!.isDisabled()).toBe(false);
  });

  it('shows the throttle delay in minutes and stays in edition', async () => {
    await submit();
    await failUpdate(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    expect(text()).toContain('2 min');
    expect(await (await nameInput()).isDisabled()).toBe(false);
  });

  it('shows server validation errors under the name', async () => {
    await submit();
    await failUpdate(400, {
      code: 'validation.failed',
      params: { fields: [{ key: 'name', code: 'validation.name.maxLength' }] },
    });

    expect(await nameErrors()).toEqual([fr.validation.name.maxLength]);
  });

  it('cancels the edition: original name back, read-only, error cleared', async () => {
    await submit();
    await failUpdate(429, { code: 'throttle.too_many_requests', params: { retryAfter: 120 } });

    await (await button(fr.me.profile.cancel))!.click();

    const input = await nameInput();
    expect(await input.getValue()).toBe('Admin');
    expect(await input.isDisabled()).toBe(true);
    expect(text()).not.toContain('2 min');
  });

  it('reports unsaved changes only while the name differs from the saved one', async () => {
    await rename('Jo');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);

    await (await nameInput()).setValue('Admin');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });
});
