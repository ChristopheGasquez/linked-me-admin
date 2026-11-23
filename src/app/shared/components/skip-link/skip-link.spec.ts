import { TestBed } from '@angular/core/testing';

import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { SkipLink } from './skip-link';

describe('SkipLink', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  it('moves the focus to the target', async () => {
    const target = document.createElement('main');
    target.tabIndex = -1;
    document.body.appendChild(target);
    const fixture = TestBed.createComponent(SkipLink);
    fixture.componentRef.setInput('target', target);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    expect(button.textContent?.trim()).toBe(fr.common.skipLink);
    button.click();

    expect(document.activeElement).toBe(target);
    target.remove();
  });
});
