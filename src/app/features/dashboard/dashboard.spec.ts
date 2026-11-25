import { TestBed } from '@angular/core/testing';

import { fr, provideTestDefaults } from '../../../testing/test-providers';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  it('shows the title and the empty state', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent?.trim()).toBe(fr.common.title.dashboard);
    expect(element.querySelector('.empty-state__title')?.textContent?.trim()).toBe(
      fr.dashboard.empty.title,
    );
    expect(element.querySelector('.empty-state__hint')?.textContent?.trim()).toBe(
      fr.dashboard.empty.hint,
    );
  });
});
