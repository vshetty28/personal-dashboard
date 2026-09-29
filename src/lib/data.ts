import { db } from "@/lib/db";
import {
  briefingPayloadSchema,
  weekendPayloadSchema,
  type BriefingPayload,
  type EmailAttentionItem,
  type Promotion,
  type Reading,
  type WeekendPayload,
} from "@/lib/digest-types";
import { addDays, keyToString, retentionCutoff, todayKey, zonedDayBounds } from "@/lib/time";

export type LoadedBriefing = { payload: BriefingPayload; updatedAt: Date };
export type LoadedWeekend = { weekOf: Date; visibleUntil: Date; payload: WeekendPayload };

/** The day's briefing, or null if none was posted (or the day is outside the retention window). */
export async function getBriefing(day: Date): Promise<LoadedBriefing | null> {
  if (day < retentionCutoff()) return null;
  try {
    const row = await db.briefing.findUnique({ where: { date: day } });
    if (!row) return null;
    const parsed = briefingPayloadSchema.safeParse(row.payload);
    if (!parsed.success) {
      console.error("Stored briefing failed validation", keyToString(day), parsed.error.issues.slice(0, 3));
      return null;
    }
    return { payload: parsed.data, updatedAt: row.updatedAt };
  } catch (err) {
    console.error("Failed to load briefing", err);
    return null;
  }
}

/**
 * The weekend briefing visible on `day`: the most recent one whose weekend has
 * started and whose visibleUntil hasn't passed (for today, "now"; for a past
 * day, the start of that day).
 */
export async function getWeekendFor(day: Date): Promise<LoadedWeekend | null> {
  if (day < retentionCutoff()) return null;
  const isToday = day.getTime() === todayKey().getTime();
  const threshold = isToday ? new Date() : zonedDayBounds(keyToString(day)).start;
  try {
    const row = await db.weekendBriefing.findFirst({
      where: { weekOf: { lte: day, gte: addDays(day, -6) }, visibleUntil: { gte: threshold } },
      orderBy: { weekOf: "desc" },
    });
    if (!row) return null;
    const parsed = weekendPayloadSchema.safeParse(row.payload);
    if (!parsed.success) {
      console.error("Stored weekend briefing failed validation", parsed.error.issues.slice(0, 3));
      return null;
    }
    return { weekOf: row.weekOf, visibleUntil: row.visibleUntil, payload: parsed.data };
  } catch (err) {
    console.error("Failed to load weekend briefing", err);
    return null;
  }
}

// --- Item marks (done / dismissed / read), shared across devices ---

export type MarkKind = "email" | "deal" | "read";

export function emailKey(day: Date, item: Pick<EmailAttentionItem, "sender" | "subject">) {
  return `email:${keyToString(day)}:${item.sender}|${item.subject}`;
}

export function dealKey(weekOf: Date, p: Pick<Promotion, "merchant" | "offer">) {
  return `deal:${keyToString(weekOf)}:${p.merchant}|${p.offer}`;
}

export function readKey(weekOf: Date, r: Pick<Reading, "url">) {
  return `read:${keyToString(weekOf)}:${r.url}`;
}

export async function getMarks(keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  try {
    const rows = await db.itemMark.findMany({ where: { key: { in: keys } }, select: { key: true } });
    return new Set(rows.map((r) => r.key));
  } catch (err) {
    console.error("Failed to load item marks", err);
    return new Set();
  }
}

// --- History (last 30 days) ---

export type HistoryDay = {
  date: string;
  hasBriefing: boolean;
  stories: number;
  mustKnow: number;
  emails: number;
  weekend: { deals: number; reads: number } | null;
};

export async function getHistory(): Promise<HistoryDay[]> {
  const cutoff = retentionCutoff();
  const today = todayKey();
  const [briefings, weekends] = await Promise.all([
    db.briefing.findMany({ where: { date: { gte: cutoff, lte: today } } }).catch(() => []),
    db.weekendBriefing.findMany({ where: { weekOf: { gte: addDays(cutoff, -6), lte: today } } }).catch(() => []),
  ]);

  const byDate = new Map<string, BriefingPayload>();
  for (const b of briefings) {
    const parsed = briefingPayloadSchema.safeParse(b.payload);
    if (parsed.success) byDate.set(keyToString(b.date), parsed.data);
  }

  const weekendByDay = new Map<string, { deals: number; reads: number }>();
  for (const w of weekends) {
    const parsed = weekendPayloadSchema.safeParse(w.payload);
    if (!parsed.success) continue;
    const counts = { deals: parsed.data.promotions.length, reads: parsed.data.readings.length };
    // Mark every day from weekOf through the day visibleUntil falls on.
    for (let d = w.weekOf; d <= today && zonedDayBounds(keyToString(d)).start <= w.visibleUntil; d = addDays(d, 1)) {
      weekendByDay.set(keyToString(d), counts);
    }
  }

  const days: HistoryDay[] = [];
  for (let d = cutoff; d <= today; d = addDays(d, 1)) {
    const key = keyToString(d);
    const p = byDate.get(key);
    const stories = p ? Object.values(p.topics).reduce((n, items) => n + items.length, 0) : 0;
    const mustKnow = p ? Object.values(p.topics).flat().filter((i) => i.priority === 1).length : 0;
    days.push({
      date: key,
      hasBriefing: !!p,
      stories,
      mustKnow,
      emails: p ? p.emailAttention.length : 0,
      weekend: weekendByDay.get(key) ?? null,
    });
  }
  return days;
}

/** Which days in [start, end] have a briefing, and which fall inside a live weekend briefing. */
export async function getStripInfo(start: Date, end: Date) {
  const [briefings, weekends] = await Promise.all([
    db.briefing.findMany({ where: { date: { gte: start, lte: end } }, select: { date: true } }).catch(() => []),
    db.weekendBriefing
      .findMany({ where: { weekOf: { gte: addDays(start, -6), lte: end } }, select: { weekOf: true, visibleUntil: true } })
      .catch(() => []),
  ]);
  const briefingDays = new Set(briefings.map((b) => keyToString(b.date)));
  const weekendDays = new Set<string>();
  for (const w of weekends) {
    for (let d = w.weekOf; d <= end && zonedDayBounds(keyToString(d)).start <= w.visibleUntil; d = addDays(d, 1)) {
      weekendDays.add(keyToString(d));
    }
  }
  return { briefingDays, weekendDays };
}
