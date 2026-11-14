import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';

import { provideTestDefaults } from '../../../testing/test-providers';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes.guard';

function runGuard(hasUnsavedChanges: boolean) {
  const component: HasUnsavedChanges = { hasUnsavedChanges: () => hasUnsavedChanges };
  return TestBed.runInInjectionContext(() =>
    unsavedChangesGuard(
      component,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  );
}

describe('unsavedChangesGuard', () => {
  let dialogResult: boolean | undefined;
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(dialogResult) })) };

  beforeEach(() => {
    localStorage.clear();
    dialog.open.mockClear();
    TestBed.configureTestingModule({
      providers: [...provideTestDefaults(), { provide: MatDialog, useValue: dialog }],
    });
  });

  it('allows leaving without unsaved changes', () => {
    expect(runGuard(false)).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('allows leaving after logout even with unsaved changes', () => {
    expect(runGuard(true)).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  describe('with unsaved changes while signed in', () => {
    beforeEach(() => localStorage.setItem('access_token', 'access-1'));

    it('asks for confirmation with a destructive dialog', () => {
      dialogResult = true;
      runGuard(true);

      expect(dialog.open).toHaveBeenCalledWith(ConfirmDialog, {
        data: expect.objectContaining({
          titleKey: 'common.unsavedChanges.title',
          destructive: true,
        }),
      });
    });

    it.each([
      [true, true],
      [false, false],
      [undefined, false],
    ])('follows the dialog answer (%s → %s)', (answer, expected) => {
      dialogResult = answer;
      let result: unknown;
      (runGuard(true) as Observable<boolean>).subscribe((value) => (result = value));

      expect(result).toBe(expected);
    });
  });
});
