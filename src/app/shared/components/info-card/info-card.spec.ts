import { TestBed } from '@angular/core/testing';

import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { InfoCard, InfoCardAction, InfoCardNotification } from './info-card';

describe('InfoCard', () => {
  async function render(
    inputs: Partial<{ notifications: InfoCardNotification[]; actions: InfoCardAction[] }> = {},
  ) {
    const fixture = TestBed.createComponent(InfoCard);
    fixture.componentRef.setInput('titleKey', 'errors.notFound.title');
    fixture.componentRef.setInput('descriptionKey', 'errors.notFound.description');
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  it('shows the translated title and description, without actions by default', async () => {
    const element = await render();

    expect(element.querySelector('h2')?.textContent?.trim()).toBe(fr.errors.notFound.title);
    expect(element.querySelector('mat-card-content')?.textContent?.trim()).toBe(
      fr.errors.notFound.description,
    );
    expect(element.querySelector('mat-card-actions')).toBeNull();
  });

  it('shows each notification with its type and params', async () => {
    const element = await render({
      notifications: [
        { type: 'success', key: 'auth.emailConfirmed.success.redirect', params: { seconds: 3 } },
        { type: 'error', key: 'errors.notFound.title' },
      ],
    });

    expect(element.querySelector('.info-card__success')?.textContent).toContain('3 seconde(s)');
    expect(element.querySelector('.info-card__error')?.textContent?.trim()).toBe(
      fr.errors.notFound.title,
    );
  });

  it('renders link actions as router links', async () => {
    const element = await render({
      actions: [
        { type: 'link', labelKey: 'errors.notFound.loginLink', routerLink: ['/auth/login'] },
      ],
    });
    const link = element.querySelector('a');

    expect(link?.getAttribute('href')).toBe('/auth/login');
    expect(link?.textContent?.trim()).toBe(fr.errors.notFound.loginLink);
  });

  it('renders button actions with their class, state and handler', async () => {
    const onClick = vi.fn();
    const element = await render({
      actions: [
        {
          type: 'button',
          labelKey: 'errors.notFound.loginLink',
          cssClass: 'button--error',
          onClick,
        },
        {
          type: 'button',
          labelKey: 'errors.notFound.dashboardLink',
          disabled: true,
          onClick: vi.fn(),
        },
      ],
    });
    const [enabled, disabled] = Array.from(element.querySelectorAll('button'));

    enabled.click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(enabled.classList).toContain('button--error');
    expect(disabled.disabled).toBe(true);
  });
});
