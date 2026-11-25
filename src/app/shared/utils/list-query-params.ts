import { ValidatorFn } from '@angular/forms';
import { Params } from '@angular/router';

export function parsePositiveInt(value: string | undefined): number | null {
  const number = Number(value);
  return value && Number.isInteger(number) && number > 0 ? number : null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUuid(value: string | undefined): string | null {
  const uuid = value?.trim().toLowerCase() ?? '';
  return UUID_PATTERN.test(uuid) ? uuid : null;
}

export const uuidValidator: ValidatorFn = (control) =>
  !control.value || parseUuid(control.value) ? null : { uuid: true };

export function parseOption<T extends string | number>(
  value: string | undefined,
  options: readonly T[],
): T | null {
  return options.find((option) => String(option) === value) ?? null;
}

// Default values are omitted from the URL (null removes the key when merging)
export function toQueryParams<T extends object>(values: T, defaults: T): Params {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value === null || value === defaults[key as keyof T] ? null : String(value),
    ]),
  );
}

export function isCanonical(raw: Record<string, string | undefined>, params: Params): boolean {
  return Object.keys(params).every((key) => (params[key] ?? undefined) === raw[key]);
}

export function sameValues<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((key) => a[key] === b[key]);
}
