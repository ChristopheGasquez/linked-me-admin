import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { breadcrumbParents } from './breadcrumb';

@Component({ template: '' })
class Page {
  readonly route = inject(ActivatedRoute);
}

const routes: Routes = [
  {
    path: 'admin',
    children: [
      {
        path: 'users',
        data: { breadcrumb: 'users' },
        children: [
          { path: '', component: Page },
          { path: ':id', component: Page },
        ],
      },
      {
        path: 'roles',
        data: { breadcrumb: 'roles' },
        children: [{ path: 'new', data: { breadcrumb: 'roles.create' }, component: Page }],
      },
      {
        path: 'audit',
        data: { breadcrumb: 'audit' },
        children: [{ path: 'users/:id', component: Page }],
      },
    ],
  },
  { path: 'dashboard', component: Page },
];

async function parentsAt(url: string) {
  const harness = await RouterTestingHarness.create();
  const page = await harness.navigateByUrl(url, Page);
  return breadcrumbParents(page.route);
}

describe('breadcrumbParents', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('returns the list as parent of a detail page', async () => {
    expect(await parentsAt('/admin/users/5')).toEqual([{ labelKey: 'users', url: '/admin/users' }]);
  });

  it('excludes the current page even when it has its own breadcrumb', async () => {
    expect(await parentsAt('/admin/roles/new')).toEqual([
      { labelKey: 'roles', url: '/admin/roles' },
    ]);
  });

  it('builds the parent URL for a detail page opened from another list', async () => {
    expect(await parentsAt('/admin/audit/users/5')).toEqual([
      { labelKey: 'audit', url: '/admin/audit' },
    ]);
  });

  it('returns no parent when no ancestor has a breadcrumb', async () => {
    expect(await parentsAt('/dashboard')).toEqual([]);
  });
});
