// Turns stored payloads + live data into the shapes the dashboard renders.
// Everything that decides a visual cue (hot/late/priority) lives here, so the
// components stay dumb and the cue rules are in one place.

import {
  BRIEFING_TOPICS,
  type BriefingPayload,
  type BriefingTopic,
  type EmailAttentionItem,
  type HeadlineTone,
} from "@/lib/digest-types";
import { dealKey, emailKey, readKey, type LoadedWeekend } from "@/lib/data";
import { daysBetween, dueLabel, keyFromString, keyToString, weekdayShort } from "@/lib/time";

// --- Emails ("Needs you") ---

export type EmailView = {
  key: string;
  date: string;
  subject: string;
  sender: string;
  category?: string;
  summary: string;
  next: string;
  /** Countdown block: "2d" / "THU". Null when the agent gave no dueAt. */
  countdown: { value: string; label: string } | null;
  /** Free-text deadline, shown when there's no countdown. */
  deadline?: string;
  /** Due within two days (or late): the countdown turns orange. */
  hot: boolean;
  done: boolean;
};

export function buildEmails(day: Date, items: EmailAttentionItem[], marks: Set<string>): EmailView[] {
  const views = items.map((item): EmailView & { sortKey: number } => {
    const key = emailKey(day, item);
    let countdown: EmailView["countdown"] = null;
    let hot = false;
    let sortKey = Number.POSITIVE_INFINITY;
    if (item.dueAt) {
      const due = keyFromString(item.dueAt);
      const n = daysBetween(day, due);
      sortKey = n;
      hot = n <= 2;
      countdown =
        n < 0
          ? { value: `${-n}d`, label: "LATE" }
          : n === 0
            ? { value: "0d", label: "TODAY" }
            : { value: `${n}d`, label: weekdayShort(due).toUpperCase() };
    }
    return {
      key,
      date: keyToString(day),
      subject: item.subject,
      sender: item.sender,
      category: item.category,
      summary: item.summary ?? item.whyItMatters,
      next: item.nextAction,
      countdown,
      deadline: item.dueAt ? undefined : item.deadline,
      hot,
      done: marks.has(key),
      sortKey,
    };
  });
  views.sort((a, b) => a.sortKey - b.sortKey);
  return views;
}

// --- Stories ---

export type StoryView = {
  id: string;
  topic: BriefingTopic;
  priority: 1 | 2 | 3;
  tldr: string;
  title: string;
  summary: string;
  why: string;
  source: string;
  url: string;
  ticker?: string;
  move?: string;
};

export function buildStories(payload: BriefingPayload): StoryView[] {
  return BRIEFING_TOPICS.flatMap((topic) =>
    payload.topics[topic].map((item, i) => ({
      id: `${topic}-${i}`,
      topic,
      priority: item.priority ?? 2,
      tldr: item.tldr || item.title,
      title: item.title,
      summary: item.summary,
      why: item.whyItMatters,
      source: item.source,
      url: item.url,
      ticker: "ticker" in item ? (item as { ticker: string }).ticker : undefined,
      move: item.move,
    })),
  );
}

export type TopicGroup = { topic: BriefingTopic; count: number; mustKnow: StoryView[]; rows: StoryView[] };

/** Per-topic groups. Priority 1 stories are split out (they render as "Must know" cards). */
export function groupStories(stories: StoryView[]): TopicGroup[] {
  return BRIEFING_TOPICS.map((topic) => {
    const all = stories.filter((s) => s.topic === topic);
    return {
      topic,
      count: all.length,
      mustKnow: all.filter((s) => s.priority === 1),
      rows: all.filter((s) => s.priority !== 1).sort((a, b) => a.priority - b.priority),
    };
  });
}

// --- Weekend briefing ---

export type DealView = {
  key: string;
  merchant: string;
  offer: string;
  detail?: string;
  code?: string;
  url?: string;
  expires?: string;
  /** Ends today: orange chip, gold-tinted row. */
  endsToday: boolean;
};

export type ReadView = { key: string; title: string; source: string; url: string; minutes?: number; why: string; type?: string; done: boolean };

export type WeekendView = {
  weekOf: string;
  deals: DealView[];
  reads: ReadView[];
  dismissedDeals: number;
};

export function buildWeekend(weekend: LoadedWeekend, today: Date, marks: Set<string>): WeekendView {
  const deals: DealView[] = [];
  let dismissedDeals = 0;
  for (const p of weekend.payload.promotions) {
    const key = dealKey(weekend.weekOf, p);
    if (marks.has(key)) {
      dismissedDeals++;
      continue;
    }
    let expires: string | undefined;
    let endsToday = false;
    if (p.expiresAt) {
      const exp = keyFromString(p.expiresAt);
      const n = daysBetween(today, exp);
      if (n < 0) continue; // expired
      endsToday = n === 0;
      expires = n === 0 ? "Ends tonight" : n < 7 ? `Ends ${dueLabel(exp, today)}` : dueLabel(exp, today);
    }
    deals.push({ key, merchant: p.merchant, offer: p.offer, detail: p.detail, code: p.code, url: p.url, expires, endsToday });
  }
  deals.sort((a, b) => Number(b.endsToday) - Number(a.endsToday));
  const reads = weekend.payload.readings.map((r) => {
    const key = readKey(weekend.weekOf, r);
    return { key, title: r.title, source: r.source, url: r.url, minutes: r.minutes, why: r.why, type: r.type, done: marks.has(key) };
  });
  return { weekOf: keyToString(weekend.weekOf), deals, reads, dismissedDeals };
}

// --- Headline ---

export type HeadlineView = { text: string; tone?: HeadlineTone }[];

/** Plain fallback when the agent didn't write a headline: counts, with the action parts in orange. */
export function fallbackHeadline(opts: {
  openEmails: EmailView[];
  overdueTasks: number;
  mustKnow: StoryView[];
  weekend: WeekendView | null;
  hasBriefing: boolean;
}): HeadlineView {
  const segs: HeadlineView = [];
  const hotEmails = opts.openEmails.filter((e) => e.hot).length;
  if (opts.openEmails.length) {
    segs.push({ text: `${opts.openEmails.length} ${opts.openEmails.length === 1 ? "email needs" : "emails need"} you`, tone: "action" });
    if (hotEmails) segs.push({ text: `, ${hotEmails} due within two days` });
  }
  if (opts.overdueTasks) {
    segs.push({ text: segs.length ? " and " : "" });
    segs.push({ text: `${opts.overdueTasks} ${opts.overdueTasks === 1 ? "task is" : "tasks are"} overdue`, tone: "action" });
  }
  if (segs.length) segs.push({ text: ". " });
  else if (opts.hasBriefing) segs.push({ text: "Nothing needs you right now. " });
  if (opts.weekend && (opts.weekend.deals.length || opts.weekend.reads.length)) {
    segs.push({ text: "Your weekend briefing is in", tone: "weekend" });
    segs.push({ text: ". " });
  }
  if (opts.mustKnow.length) {
    segs.push({ text: "Must know: " });
    opts.mustKnow.forEach((s, i) => {
      if (i) segs.push({ text: i === opts.mustKnow.length - 1 ? " and " : ", " });
      segs.push({ text: s.tldr.replace(/\.$/, ""), tone: s.topic });
    });
    segs.push({ text: "." });
  }
  if (!segs.length) segs.push({ text: "No briefing for this day." });
  return segs;
}
