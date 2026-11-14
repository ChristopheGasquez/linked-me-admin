import {
  isCanonical,
  parseOption,
  parsePositiveInt,
  sameValues,
  toQueryParams,
} from './list-query-params';

describe('list-query-params', () => {
  describe('parsePositiveInt', () => {
    it('parses positive integers', () => {
      expect(parsePositiveInt('1')).toBe(1);
      expect(parsePositiveInt('42')).toBe(42);
    });

    it.each([undefined, '', '0', '-3', '1.5', 'abc', '10a'])('returns null for %j', (value) => {
      expect(parsePositiveInt(value)).toBeNull();
    });
  });

  describe('parseOption', () => {
    it('returns the matching option', () => {
      expect(parseOption('asc', ['asc', 'desc'])).toBe('asc');
    });

    it('matches numeric options by their string form', () => {
      expect(parseOption('50', [10, 20, 50])).toBe(50);
    });

    it('returns null for unknown or missing values', () => {
      expect(parseOption('7', [10, 20, 50])).toBeNull();
      expect(parseOption(undefined, ['asc', 'desc'])).toBeNull();
    });
  });

  describe('toQueryParams', () => {
    const defaults: { page: number; sortOrder: string; search: string | null } = {
      page: 1,
      sortOrder: 'desc',
      search: null,
    };

    it('stringifies values that differ from the defaults', () => {
      expect(toQueryParams({ page: 3, sortOrder: 'asc', search: 'jo' }, defaults)).toEqual({
        page: '3',
        sortOrder: 'asc',
        search: 'jo',
      });
    });

    it('maps default and null values to null so they are removed from the URL', () => {
      expect(toQueryParams(defaults, defaults)).toEqual({
        page: null,
        sortOrder: null,
        search: null,
      });
    });
  });

  describe('isCanonical', () => {
    it('accepts a URL matching the params, missing keys standing for null', () => {
      expect(isCanonical({ page: '3', search: undefined }, { page: '3', search: null })).toBe(true);
    });

    it('rejects a URL holding a default value', () => {
      expect(isCanonical({ page: '1' }, { page: null })).toBe(false);
    });

    it('rejects a URL whose value was normalized', () => {
      expect(isCanonical({ page: 'abc' }, { page: null })).toBe(false);
      expect(isCanonical({ search: ' jo ' }, { search: 'jo' })).toBe(false);
    });
  });

  describe('sameValues', () => {
    it('compares objects key by key', () => {
      expect(sameValues({ page: 1, search: null }, { page: 1, search: null })).toBe(true);
      expect(sameValues({ page: 1, search: null }, { page: 2, search: null })).toBe(false);
    });
  });
});
