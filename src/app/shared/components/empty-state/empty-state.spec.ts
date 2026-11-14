import { TestBed } from '@angular/core/testing';

import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  async function render(inputs: Record<string, string> = {}) {
    const fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('icon', 'person_off');
    fixture.componentRef.setInput('titleKey', 'admin.users.empty');
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  it('shows the icon and the translated title only', async () => {
    const element: HTMLElement = (await render()).nativeElement;

    expect(element.querySelector('mat-icon')?.textContent?.trim()).toBe('person_off');
    expect(element.querySelector('.empty-state__title')?.textContent?.trim()).toBe(
      fr.admin.users.empty,
    );
    expect(element.querySelector('.empty-state__hint')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });

  it('shows the hint and the action when given', async () => {
    const element: HTMLElement = (
      await render({
        hintKey: 'common.emptyFiltered.hint',
        actionLabelKey: 'common.emptyFiltered.reset',
      })
    ).nativeElement;

    expect(element.querySelector('.empty-state__hint')?.textContent?.trim()).toBe(
      fr.common.emptyFiltered.hint,
    );
    expect(element.querySelector('button')?.textContent?.trim()).toBe(
      fr.common.emptyFiltered.reset,
    );
  });

  it('emits the action on click', async () => {
    const fixture = await render({ actionLabelKey: 'common.emptyFiltered.reset' });
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);

    fixture.nativeElement.querySelector('button').click();

    expect(action).toHaveBeenCalledOnce();
  });
});
