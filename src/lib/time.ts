/**
 * Timezone-aware date helpers.
 *
 * The server runs in UTC (Vercel), but "today", event times and the schedule
 * timeline all need to follow the dashboard owner's wall clock. Everything here
 * goes through DASHBOARD_TIMEZONE (an IANA name, defaults to Eastern/Indiana).
 *
 * Day keys: `Briefing.date` and friends are Postgres DATE columns, stored as
 * UTC-midnight instants of the *local* calendar date (e.g. local Tue Sep 29 ->
 * 2026-09-29T00:00:00.000Z). `dayKey()` builds those; never use `new Date()`
 * directly as a key.
 */

export const TIMEZONE = process.env.DASHBOARD_TIMEZONE || "America/Indiana/Indianapolis";

export const RETENTION_DAYS = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parts(instant: Date, timeZone = TIMEZONE) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(instant)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** "YYYY-MM-DD" for the local calendar date of `instant` (default: now). */
export function localDateString(instant: Date = new Date()): string {
  const p = parts(instant);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** UTC-midnight Date for a "YYYY-MM-DD" string, the shape stored in @db.Date columns. */
export function keyFromString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** "YYYY-MM-DD" for a day key. */
export function keyToString(key: Date): string {
  return key.toISOString().slice(0, 10);
}

/** Day key for today in the dashboard timezone. */
export function todayKey(): Date {
  return keyFromString(localDateString());
}

/** Parses a ?date=YYYY-MM-DD param, falling back to today for missing/malformed values. */
export function parseDateParam(value: string | undefined): Date {
  if (!value || !DATE_RE.test(value)) return todayKey();
  const parsed = keyFromString(value);
  return Number.isNaN(parsed.getTime()) ? todayKey() : parsed;
}

export function isDateString(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(keyFromString(value).getTime());
}

/** Adds whole days to a day key. */
export function addDays(key: Date, days: number): Date {
  const d = new Date(key);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Whole days from `from` to `to` (both day keys). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** Oldest day key still inside the retention window. */
export function retentionCutoff(): Date {
  return addDays(todayKey(), -(RETENTION_DAYS - 1));
}

/** 0 = Sunday ... 6 = Saturday, for a day key. */
export function weekday(key: Date): number {
  return key.getUTCDay();
}

/** Minutes the timezone is ahead of UTC at `instant` (negative for the Americas). */
function offsetMinutes(instant: Date): number {
  const p = parts(instant);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/** The instant a local wall-clock time occurs, e.g. zonedInstant("2026-09-29", 0) = local midnight. */
export function zonedInstant(dateString: string, hour = 0, minute = 0): Date {
  const [y, m, d] = dateString.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const first = guess - offsetMinutes(new Date(guess)) * 60_000;
  // Re-check once in case the guess and the answer straddle a DST switch.
  return new Date(guess - offsetMinutes(new Date(first)) * 60_000);
}

/** Start and end instants of a local calendar day. */
export function zonedDayBounds(dateString: string) {
  const start = zonedInstant(dateString, 0, 0);
  const next = keyToString(addDays(keyFromString(dateString), 1));
  const end = new Date(zonedInstant(next, 0, 0).getTime() - 1);
  return { start, end };
}

/** Local hour of day as a decimal (9:30 -> 9.5). */
export function localHour(instant: Date): number {
  const p = parts(instant);
  return p.hour + p.minute / 60;
}

/** "9:00" style local time (no am/pm, the timeline supplies context). */
export function formatClock(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true })
    .format(instant)
    .replace(/\s?(AM|PM)$/i, "");
}

/** "9:00 AM" style local time. */
export function formatClockMeridiem(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(
    instant,
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function weekdayShort(key: Date) {
  return WEEKDAYS[weekday(key)];
}

/** "TUESDAY · SEP 29" */
export function eyebrowDate(key: Date) {
  return `${WEEKDAYS_LONG[weekday(key)]} · ${MONTHS[key.getUTCMonth()]} ${key.getUTCDate()}`.toUpperCase();
}

/** "Sep 29" */
export function shortDate(key: Date) {
  return `${MONTHS[key.getUTCMonth()]} ${key.getUTCDate()}`;
}

/** "in 18 min", "in 2 hr", "now" */
export function relativeUntil(target: Date, now: Date = new Date()): string {
  const mins = Math.round((target.getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem >= 10 && hrs < 3 ? `in ${hrs} hr ${rem} min` : `in ${hrs} hr`;
}

/**
 * Human label for a due date relative to today: "Today", "Tomorrow", a weekday
 * inside the next week, else "Oct 15".
 */
export function dueLabel(due: Date, today: Date = todayKey()) {
  const n = daysBetween(today, due);
  if (n < 0) return `${-n}d late`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n < 7) return WEEKDAYS[weekday(due)];
  return shortDate(due);
}

/** Saturday key that starts the weekend containing (or following) `key`. Fri rolls forward, Sun rolls back. */
export function weekendStart(key: Date): Date {
  const wd = weekday(key);
  if (wd === 6) return key;
  if (wd === 0) return addDays(key, -1);
  return addDays(key, 6 - wd);
}
