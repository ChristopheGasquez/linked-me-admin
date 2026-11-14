import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { provideTestDefaults } from '../../../testing/test-providers';
import { AuthService } from './auth.service';
import { UrlService } from './url.service';

@Component({ template: '' })
class List {
  constructor() {
    inject(UrlService).trackListUrl();
  }
}

@Component({ template: '' })
class Detail {}

describe('UrlService', () => {
  let harness: RouterTestingHarness;
  let urlService: UrlService;

  const link = (path: string) => TestBed.inject(Router).serializeUrl(urlService.listLink(path));

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        ...provideTestDefaults(),
        provideRouter([
          { path: 'users', component: List },
          { path: 'users/:id', component: Detail },
          { path: 'roles', component: List },
        ]),
      ],
    });
    urlService = TestBed.inject(UrlService);
    harness = await RouterTestingHarness.create();
  });

  it('returns the plain path when no list was visited', () => {
    expect(link('/users')).toBe('/users');
  });

  it('restores the list URL with its query params from a detail page', async () => {
    await harness.navigateByUrl('/users?page=2&search=jo');
    await harness.navigateByUrl('/users/5');

    expect(link('/users')).toBe('/users?page=2&search=jo');
  });

  it('keeps the latest URL of the list', async () => {
    await harness.navigateByUrl('/users?page=2');
    await harness.navigateByUrl('/users');

    expect(link('/users')).toBe('/users');
  });

  it('forgets a list once another list was visited', async () => {
    await harness.navigateByUrl('/users?page=2');
    await harness.navigateByUrl('/roles?search=admin');

    expect(link('/users')).toBe('/users');
    expect(link('/roles')).toBe('/roles?search=admin');
  });

  it('is cleared on logout', async () => {
    await harness.navigateByUrl('/users?page=2');

    TestBed.inject(AuthService).logout();

    expect(link('/users')).toBe('/users');
  });
});
