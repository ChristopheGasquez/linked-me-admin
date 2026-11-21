import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { FakeTurnstileApi, fakeTurnstile } from '../../../../testing/turnstile-stub';
import { AppConfigService } from '../../../core/services/app-config.service';
import { ThemeService } from '../../../core/services/theme.service';
import { TurnstileService } from '../../../core/services/turnstile.service';
import { Turnstile } from './turnstile';

describe('Turnstile', () => {
  let fixture: ComponentFixture<Turnstile>;
  let api: FakeTurnstileApi;

  const token = () => fixture.componentInstance.token();
  const lastOptions = () => api.render.mock.lastCall![1];

  async function render() {
    fixture = TestBed.createComponent(Turnstile);
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.setItem('theme', 'light');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    vi.spyOn(TestBed.inject(AppConfigService), 'turnstileSiteKey', 'get').mockReturnValue(
      'site-key',
    );
    api = fakeTurnstile();
  });

  afterEach(() => localStorage.clear());

  it('renders an always visible widget with the site key, the theme and the language', async () => {
    await render();

    expect(api.render).toHaveBeenCalledTimes(1);
    expect(api.render.mock.lastCall![0]).toBe(fixture.nativeElement.querySelector('div'));
    expect(lastOptions()).toMatchObject({
      sitekey: 'site-key',
      theme: 'light',
      language: 'fr',
      size: 'flexible',
      appearance: 'always',
    });
  });

  it('exposes the token once solved, and clears it on expiry or error', async () => {
    await render();
    expect(token()).toBeNull();

    api.solve('token-1');
    expect(token()).toBe('token-1');

    api.expire();
    expect(token()).toBeNull();

    api.solve('token-2');
    api.fail();
    expect(token()).toBeNull();
  });

  it('resets the widget and clears the token', async () => {
    await render();
    api.solve('token-1');

    fixture.componentInstance.reset();

    expect(api.reset).toHaveBeenCalledWith('widget-1');
    expect(token()).toBeNull();
  });

  it('renders the widget again in the new theme', async () => {
    await render();
    api.solve('token-1');

    TestBed.inject(ThemeService).toggle();
    await fixture.whenStable();

    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(lastOptions().theme).toBe('dark');
    expect(api.widgets.size).toBe(1);
    expect(token()).toBeNull();
  });

  it('renders the widget again in the new language', async () => {
    await render();

    TestBed.inject(TranslocoService).setActiveLang('en');
    await fixture.whenStable();

    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(lastOptions().language).toBe('en');
  });

  it('removes the widget when destroyed', async () => {
    await render();

    fixture.destroy();

    expect(api.remove).toHaveBeenCalledWith('widget-1');
    expect(api.widgets.size).toBe(0);
  });

  it('explains when the Cloudflare script cannot be loaded', async () => {
    vi.spyOn(TestBed.inject(TurnstileService), 'load').mockRejectedValue(new Error('blocked'));

    await render();

    expect(fixture.nativeElement.textContent).toContain(fr.common.turnstile.loadError);
    expect(api.render).not.toHaveBeenCalled();
  });
});
