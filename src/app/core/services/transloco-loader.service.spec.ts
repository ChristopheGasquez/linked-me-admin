import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideTestDefaults } from '../../../testing/test-providers';
import { TranslocoHttpLoader } from './transloco-loader.service';

describe('TranslocoHttpLoader', () => {
  it('loads the translations of a language from /i18n', () => {
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    let translation: unknown;

    TestBed.inject(TranslocoHttpLoader)
      .getTranslation('en')
      .subscribe((value) => (translation = value));
    TestBed.inject(HttpTestingController).expectOne('/i18n/en.json').flush({ hello: 'Hello' });

    expect(translation).toEqual({ hello: 'Hello' });
  });
});
