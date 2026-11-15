import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  // Simulates the operating system color scheme
  function prefersDark(dark: boolean) {
    vi.mocked(window.matchMedia).mockImplementation(
      (query: string) =>
        ({
          matches: dark && query === '(prefers-color-scheme: dark)',
          media: query,
        }) as MediaQueryList,
    );
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => prefersDark(false));

  it('follows the system preference when nothing is stored', () => {
    prefersDark(true);

    const theme = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(theme.isDark()).toBe(true);
    expect(document.documentElement.classList).toContain('dark');
  });

  it('prefers the stored choice over the system preference', () => {
    prefersDark(true);
    localStorage.setItem('theme', 'light');

    const theme = TestBed.inject(ThemeService);
    TestBed.tick();

    expect(theme.isDark()).toBe(false);
    expect(document.documentElement.classList).not.toContain('dark');
  });
});
