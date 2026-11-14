import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';

import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  async function open(data: ConfirmDialogData) {
    let result: unknown = 'open';
    TestBed.inject(MatDialog)
      .open(ConfirmDialog, { data })
      .afterClosed()
      .subscribe((value) => (result = value));
    await TestBed.inject(ApplicationRef).whenStable();
    const container = Array.from(document.querySelectorAll<HTMLElement>('mat-dialog-container')).at(
      -1,
    )!;
    const [cancel, confirm] = Array.from(container.querySelectorAll('button'));
    return { container, cancel, confirm, result: () => result };
  }

  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  it('shows the translated title and message with its params', async () => {
    const { container } = await open({
      titleKey: 'common.unsavedChanges.title',
      messageKey: 'admin.users.detail.delete.confirm',
      messageParams: { name: 'Alice' },
    });

    expect(container.querySelector('h2')?.textContent?.trim()).toBe(fr.common.unsavedChanges.title);
    expect(container.querySelector('mat-dialog-content')?.textContent).toContain('Alice');
  });

  it('uses the default confirm label, or the given one, and the destructive style', async () => {
    const plain = await open({
      titleKey: 'common.unsavedChanges.title',
      messageKey: 'common.unsavedChanges.message',
    });
    expect(plain.confirm.textContent?.trim()).toBe(fr.common.confirm);
    expect(plain.confirm.classList).not.toContain('button--error');

    const destructive = await open({
      titleKey: 'common.unsavedChanges.title',
      messageKey: 'common.unsavedChanges.message',
      confirmLabelKey: 'common.unsavedChanges.leave',
      destructive: true,
    });
    expect(destructive.confirm.textContent?.trim()).toBe(fr.common.unsavedChanges.leave);
    expect(destructive.confirm.classList).toContain('button--error');
  });

  it.each([
    ['cancel', false],
    ['confirm', true],
  ] as const)('closes with %s → %s', async (button, expected) => {
    const dialog = await open({
      titleKey: 'common.unsavedChanges.title',
      messageKey: 'common.unsavedChanges.message',
    });

    dialog[button].click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(dialog.result()).toBe(expected);
  });
});
