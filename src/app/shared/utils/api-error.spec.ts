import { formatRetryAfter } from './api-error';

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
