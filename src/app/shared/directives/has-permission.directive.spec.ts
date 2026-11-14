import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../core/services/auth.service';
import { provideTestDefaults, testUser } from '../../../testing/test-providers';
import { HasPermissionDirective } from './has-permission.directive';

@Component({
  imports: [HasPermissionDirective],
  template: `<p *appHasPermission="permissions()">secret</p>`,
})
class Host {
  readonly permissions = signal<string | string[]>('admin:user:read');
}

describe('HasPermissionDirective', () => {
  let authService: AuthService;

  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  }

  const content = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.textContent?.trim();

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    authService = TestBed.inject(AuthService);
  });

  it('hides the content without user', async () => {
    expect(content(await render())).toBe('');
  });

  it('hides the content when the permission is missing', async () => {
    authService.currentUser.set(testUser(['realm:profile']));

    expect(content(await render())).toBe('');
  });

  it('shows the content when the user holds any of the permissions', async () => {
    authService.currentUser.set(testUser(['admin:role:read']));
    const fixture = await render();
    fixture.componentInstance.permissions.set(['admin:user:read', 'admin:role:read']);
    await fixture.whenStable();

    expect(content(fixture)).toBe('secret');
  });

  it('follows user changes', async () => {
    authService.currentUser.set(testUser(['admin:user:read']));
    const fixture = await render();
    expect(content(fixture)).toBe('secret');

    authService.currentUser.set(null);
    await fixture.whenStable();

    expect(content(fixture)).toBe('');
  });
});
