import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { UrlService } from '../../../core/services/url.service';
import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { Breadcrumb } from './breadcrumb';

@Component({ template: '' })
class ListPage {
  constructor() {
    inject(UrlService).trackListUrl();
  }
}

@Component({ imports: [Breadcrumb], template: `<app-breadcrumb label="Alice" />` })
class DetailPage {}

@Component({ imports: [Breadcrumb], template: `<app-breadcrumb />` })
class CreatePage {}

const routes: Routes = [
  {
    path: 'admin/users',
    data: { breadcrumb: 'layout.private.sidenav.users' },
    children: [
      { path: '', component: ListPage },
      { path: ':id', component: DetailPage },
    ],
  },
  {
    path: 'admin/roles',
    data: { breadcrumb: 'layout.private.sidenav.roles' },
    children: [{ path: 'new', data: { breadcrumb: 'admin.roles.create' }, component: CreatePage }],
  },
];

describe('Breadcrumb', () => {
  let harness: RouterTestingHarness;

  async function renderAt(url: string): Promise<HTMLElement> {
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    return harness.routeNativeElement!;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [...provideTestDefaults(), provideRouter(routes)],
    });
    harness = await RouterTestingHarness.create();
  });

  it('links to the parent list and shows the current page label', async () => {
    const element = await renderAt('/admin/users/5');
    const link = element.querySelector('a');

    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe(fr.common.breadcrumb);
    expect(link?.getAttribute('href')).toBe('/admin/users');
    expect(link?.textContent?.trim()).toBe(fr.layout.private.sidenav.users);
    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Alice');
  });

  it('restores the filters of the list it comes from', async () => {
    await renderAt('/admin/users?page=2&search=jo');
    const element = await renderAt('/admin/users/5');

    expect(element.querySelector('a')?.getAttribute('href')).toBe('/admin/users?page=2&search=jo');
  });

  it("falls back to the route's breadcrumb when no label is given", async () => {
    const element = await renderAt('/admin/roles/new');

    expect(element.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe(
      fr.admin.roles.create,
    );
  });
});
