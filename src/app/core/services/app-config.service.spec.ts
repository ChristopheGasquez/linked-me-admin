import { TestBed } from '@angular/core/testing';

import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('has no API URL before the config is loaded', () => {
    expect(TestBed.inject(AppConfigService).apiUrl).toBe('');
  });

  it('loads the API URL from /config.json', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ apiUrl: 'https://api.test' })));
    const config = TestBed.inject(AppConfigService);

    await config.load();

    expect(fetch).toHaveBeenCalledWith('/config.json');
    expect(config.apiUrl).toBe('https://api.test');
  });
});
