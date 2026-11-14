import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/services/auth.service';
import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { DisableIfNoPermissionDirective } from './disable-if-no-permission.directive';

@Component({
  imports: [DisableIfNoPermissionDirective],
  template: `<button [appDisableIfNoPermission]="'admin:user:manage'">Delete</button>`,
})
class Host {}

describe('DisableIfNoPermissionDirective', () => {
  async function renderButton(): Promise<HTMLButtonElement> {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('button');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
  });

  it('disables the element when the permission is missing', async () => {
    TestBed.inject(AuthService).currentUser.set(testUser(['admin:user:read']));
    const button = await renderButton();

    expect(button.disabled).toBe(true);
    expect(button.style.pointerEvents).toBe('none');
  });

  it('enables the element when the user holds the permission', async () => {
    TestBed.inject(AuthService).currentUser.set(testUser(['admin:user:manage']));
    const button = await renderButton();

    expect(button.disabled).toBe(false);
    expect(button.style.pointerEvents).toBe('');
  });
});
