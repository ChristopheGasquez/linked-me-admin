import { TurnstileApi, TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  const scripts = () =>
    document.head.querySelectorAll<HTMLScriptElement>('script[src*="challenges.cloudflare.com"]');

  afterEach(() => {
    scripts().forEach((script) => script.remove());
    delete window.turnstile;
  });

  it('adds the explicit-render script only once', () => {
    const service = new TurnstileService();

    service.load();
    service.load();

    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
    );
    expect(scripts()[0].async).toBe(true);
  });

  it('resolves with the Cloudflare API once the script is loaded', async () => {
    const api = {} as TurnstileApi;
    const loading = new TurnstileService().load();

    window.turnstile = api;
    scripts()[0].dispatchEvent(new Event('load'));

    await expect(loading).resolves.toBe(api);
  });

  it('rejects when the script fails to load, then tries again on the next load', async () => {
    const service = new TurnstileService();
    const loading = service.load();

    scripts()[0].dispatchEvent(new Event('error'));

    await expect(loading).rejects.toThrow();
    expect(scripts()).toHaveLength(0);

    service.load();
    expect(scripts()).toHaveLength(1);
  });
});
