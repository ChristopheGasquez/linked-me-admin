import { TestBed } from '@angular/core/testing';

import { AppConfigService } from './app-config.service';
import { ReturnUrlService } from './return-url.service';

describe('ReturnUrlService', () => {
  let returnUrls: ReturnUrlService;

  beforeEach(() => {
    vi.spyOn(TestBed.inject(AppConfigService), 'returnUrlOrigins', 'get').mockReturnValue([
      'https://app.gasquez.fr',
      'http://localhost:4300',
    ]);
    returnUrls = TestBed.inject(ReturnUrlService);
  });

  it.each([
    [
      'https://app.gasquez.fr/projects/1?tab=info#top',
      'https://app.gasquez.fr/projects/1?tab=info#top',
    ],
    ['https://app.gasquez.fr', 'https://app.gasquez.fr/'],
    ['http://localhost:4300/home', 'http://localhost:4300/home'],
  ])('accepts %s', (returnUrl, expected) => {
    expect(returnUrls.resolve(returnUrl)).toBe(expected);
  });

  it.each([
    ['a lookalike domain', 'https://app.gasquez.fr.evil.com/'],
    ['another subdomain', 'https://other.gasquez.fr/'],
    ['another protocol', 'http://app.gasquez.fr/'],
    ['another port', 'https://app.gasquez.fr:8443/'],
    ['credentials before the host', 'https://app.gasquez.fr@evil.com/'],
    ['a relative path', '/admin/users'],
    ['a protocol-relative URL', '//evil.com/'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a malformed URL', 'https://'],
    ['an empty value', ''],
    ['no value', undefined],
  ])('rejects %s', (_, returnUrl) => {
    expect(returnUrls.resolve(returnUrl)).toBeNull();
  });

  it('rejects everything when no origin is allowed', () => {
    vi.spyOn(TestBed.inject(AppConfigService), 'returnUrlOrigins', 'get').mockReturnValue([]);

    expect(returnUrls.resolve('https://app.gasquez.fr/')).toBeNull();
  });
});
