import { TestBed } from '@angular/core/testing';

import { provideTestDefaults } from '../../../../testing/test-providers';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  async function render() {
    const fixture = TestBed.createComponent(ThemeToggle);
    await fixture.whenStable();
    return fixture;
  }

  const icon = (fixture: { nativeElement: HTMLElement }) =>
    fixture.nativeElement.querySelector('mat-icon')?.textContent?.trim();

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
  });

  it('switches between light and dark themes', async () => {
    const fixture = await render();
    expect(icon(fixture)).toBe('dark_mode');

    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();

    expect(icon(fixture)).toBe('light_mode');
    expect(document.documentElement.classList).toContain('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('starts from the stored theme', async () => {
    localStorage.setItem('theme', 'dark');

    expect(icon(await render())).toBe('light_mode');
  });
});
