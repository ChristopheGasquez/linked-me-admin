import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';

import { fr, provideTestDefaults, uuid } from '../../../../testing/test-providers';
import { Uuid } from './uuid';

describe('Uuid', () => {
  async function render(link?: unknown[]) {
    const fixture = TestBed.createComponent(Uuid);
    fixture.componentRef.setInput('value', uuid(42));
    fixture.componentRef.setInput('link', link);
    await fixture.whenStable();
    return fixture;
  }

  const tooltips = (fixture: Awaited<ReturnType<typeof render>>) =>
    fixture.debugElement
      .queryAll(By.directive(MatTooltip))
      .map((node) => node.injector.get(MatTooltip).message);

  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  afterEach(() => vi.useRealTimers());

  it('shows the end of the id, with the full id in its tooltip', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.uuid__value')!.textContent!.trim()).toBe('…00000042');
    expect(element.querySelector('a')).toBeNull();
    expect(tooltips(fixture)).toEqual([uuid(42), fr.common.uuid.copy]);
  });

  it('links to the given route', async () => {
    const element: HTMLElement = (await render(['/admin/users', uuid(42)])).nativeElement;

    expect(element.querySelector('a')!.getAttribute('href')).toBe(`/admin/users/${uuid(42)}`);
  });

  it('copies the full id, announces it and shows a check for a moment', async () => {
    const copy = vi.spyOn(TestBed.inject(Clipboard), 'copy').mockReturnValue(true);
    const announce = vi.spyOn(TestBed.inject(LiveAnnouncer), 'announce');
    const fixture = await render();
    vi.useFakeTimers();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const icon = () => button.querySelector('mat-icon')!.textContent!.trim();

    expect(button.getAttribute('aria-label')).toBe(fr.common.uuid.copy);
    expect(icon()).toBe('content_copy');

    button.click();
    fixture.detectChanges();

    expect(copy).toHaveBeenCalledWith(uuid(42));
    expect(announce).toHaveBeenCalledWith(fr.common.uuid.copied);
    expect(icon()).toBe('check');

    vi.advanceTimersByTime(2000);
    fixture.detectChanges();

    expect(icon()).toBe('content_copy');
  });
});
