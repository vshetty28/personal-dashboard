/**
 * UTC midnight for "today", as an unambiguous instant. Used as the key for
 * `Digest.date` (a `@db.Date` column). `new Date(new Date().toDateString())`
 * looks equivalent but isn't: it builds *local* midnight, which in a
 * non-UTC timezone serializes to a non-zero UTC time-of-day. Prisma
 * normalizes that inconsistently between writing a `@db.Date` value and
 * filtering on it, so the two can silently stop matching.
 */
export function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a "YYYY-MM-DD" URL param (e.g. from a date picker) into the same
 * UTC-midnight instant `startOfTodayUTC()` produces, so it matches what's
 * stored in `Digest.date`. Falls back to today for a missing/malformed value.
 */
export function parseDateParam(value: string | undefined): Date {
  if (!value || !DATE_PARAM_RE.test(value)) return startOfTodayUTC();
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? startOfTodayUTC() : parsed;
}

/** Inverse of `parseDateParam` — formats a UTC-midnight Date back to "YYYY-MM-DD". */
export function formatDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}
