import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';

import en from '../../../../public/i18n/en.json';
import { fr, provideTestDefaults } from '../../../testing/test-providers';
import { TranslatedPaginatorIntl } from './paginator-intl.service';

describe('TranslatedPaginatorIntl', () => {
  let intl: TranslatedPaginatorIntl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTestDefaults(), TranslatedPaginatorIntl],
    });
    intl = TestBed.inject(TranslatedPaginatorIntl);
  });

  const labels = () => [
    intl.itemsPerPageLabel,
    intl.firstPageLabel,
    intl.previousPageLabel,
    intl.nextPageLabel,
    intl.lastPageLabel,
  ];

  it('uses the French labels', () => {
    const { itemsPerPage, firstPage, previousPage, nextPage, lastPage } = fr.common.paginator;
    expect(labels()).toEqual([itemsPerPage, firstPage, previousPage, nextPage, lastPage]);
  });

  it('switches labels and notifies paginators when the language changes', () => {
    const changes = vi.fn();
    intl.changes.subscribe(changes);

    TestBed.inject(TranslocoService).setActiveLang('en');

    const { itemsPerPage, firstPage, previousPage, nextPage, lastPage } = en.common.paginator;
    expect(labels()).toEqual([itemsPerPage, firstPage, previousPage, nextPage, lastPage]);
    expect(changes).toHaveBeenCalled();
  });

  it('describes the displayed range', () => {
    expect(intl.getRangeLabel(0, 10, 12)).toBe('1 – 10 sur 12');
    expect(intl.getRangeLabel(1, 10, 12)).toBe('11 – 12 sur 12');
  });

  it('describes an empty list', () => {
    expect(intl.getRangeLabel(0, 10, 0)).toBe('0 sur 0');
  });
});
