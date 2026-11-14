import { HttpErrorResponse } from '@angular/common/http';

import { formatRetryAfter, toApiError } from './api-error';

describe('formatRetryAfter', () => {
  it('formats durations under a minute in seconds', () => {
    expect(formatRetryAfter(0)).toBe('0s');
    expect(formatRetryAfter(59)).toBe('59s');
  });

  it('rounds durations of a minute or more up to the next minute', () => {
    expect(formatRetryAfter(60)).toBe('1 min');
    expect(formatRetryAfter(61)).toBe('2 min');
    expect(formatRetryAfter(900)).toBe('15 min');
  });
});

describe('toApiError', () => {
  const httpError = (error: unknown) => new HttpErrorResponse({ error, status: 400 });

  it('keeps the code and params of the API response', () => {
    expect(toApiError(httpError({ code: 'auth.register.conflict', params: { id: 3 } }))).toEqual({
      code: 'auth.register.conflict',
      params: { id: 3 },
    });
  });

  it('formats the retry delay of a throttled request', () => {
    const throttled = (retryAfter: number) =>
      httpError({ code: 'throttle.too_many_requests', params: { retryAfter } });

    expect(toApiError(throttled(120)).params).toEqual({ retryAfter: '2 min' });
    expect(toApiError(throttled(45)).params).toEqual({ retryAfter: '45s' });
  });

  it.each([
    ['empty body', null],
    ['non-JSON body', '<html>Bad Gateway</html>'],
  ])('falls back to the unknown error (%s)', (_, body) => {
    expect(toApiError(httpError(body))).toEqual({ code: 'unknown', params: undefined });
  });

  it('falls back to the forbidden error on a 403 without code', () => {
    expect(toApiError(new HttpErrorResponse({ error: null, status: 403 })).code).toBe('forbidden');
  });
});
