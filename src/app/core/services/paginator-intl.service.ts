import { inject, Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { TranslocoService } from '@jsverse/transloco';
import { tap } from 'rxjs/operators';

interface PaginatorLabels {
  itemsPerPage: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;
}

// Material paginator labels in the active language, updated on language change
@Injectable()
export class TranslatedPaginatorIntl extends MatPaginatorIntl {
  #transloco = inject(TranslocoService);

  constructor() {
    super();
    this.#transloco
      .selectTranslateObject<PaginatorLabels>('common.paginator')
      .pipe(
        tap((labels) => {
          this.itemsPerPageLabel = labels.itemsPerPage;
          this.firstPageLabel = labels.firstPage;
          this.previousPageLabel = labels.previousPage;
          this.nextPageLabel = labels.nextPage;
          this.lastPageLabel = labels.lastPage;
          this.changes.next();
        }),
      )
      .subscribe();
  }

  // Same computation as Material's default label
  override getRangeLabel = (page: number, pageSize: number, length: number): string => {
    if (length === 0 || pageSize === 0) {
      return this.#transloco.translate('common.paginator.rangeEmpty', { total: length });
    }
    const start = page * pageSize;
    const end = start < length ? Math.min(start + pageSize, length) : start + pageSize;
    return this.#transloco.translate('common.paginator.range', {
      start: start + 1,
      end,
      total: length,
    });
  };
}
