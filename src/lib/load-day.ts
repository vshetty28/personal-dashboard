import { getTodaysCalendarEvents } from "@/lib/google";
import { getTodaysTickTickTasks, type DashboardTask } from "@/lib/ticktick";
import { getBriefing, getMarks, getStripInfo, getWeekendFor, emailKey, dealKey, readKey } from "@/lib/data";
import {
  TIMEZONE,
  addDays,
  eyebrowDate,
  formatClockMeridiem,
  keyToString,
  parseDateParam,
  relativeUntil,
  retentionCutoff,
  shortDate,
  todayKey,
  weekdayShort,
} from "@/lib/time";
import {
  buildEmails,
  buildStories,
  buildWeekend,
  fallbackHeadline,
  groupStories,
  type HeadlineView,
} from "@/lib/view";
import type { StripDay } from "@/components/dashboard/TopBar";
import type { Tile } from "@/components/dashboard/GlanceTiles";
import type { TimelineEvent } from "@/components/dashboard/ScheduleTimeline";

/**
 * Everything the Today and Briefing pages need for one day. Live sources
 * (calendar, TickTick) are only fetched for today; stored ones for any day in
 * the 30-day window.
 */
export async function loadDay(dateParam: string | string[] | undefined, opts: { live: boolean }) {
  const raw = Array.isArray(dateParam) ? dateParam[0] : dateParam;
  const today = todayKey();
  const cutoff = retentionCutoff();
  let day = parseDateParam(raw);
  if (day > today) day = today;
  if (day < cutoff) day = cutoff;
  const isToday = day.getTime() === today.getTime();
  const dateStr = keyToString(day);

  // Week strip: seven days around the selected one, never past today or before the window.
  let stripEnd = addDays(day, 3);
  if (stripEnd > today) stripEnd = today;
  let stripStart = addDays(stripEnd, -6);
  if (stripStart < cutoff) {
    stripStart = cutoff;
    stripEnd = addDays(cutoff, 6) > today ? today : addDays(cutoff, 6);
  }

  const live = opts.live && isToday;
  const [briefing, weekendRow, calendar, tasks, strip] = await Promise.all([
    getBriefing(day),
    getWeekendFor(day),
    live ? getTodaysCalendarEvents().catch((e) => (console.error(e), null)) : Promise.resolve(null),
    live ? getTodaysTickTickTasks().catch((e) => (console.error(e), null)) : Promise.resolve(null),
    getStripInfo(stripStart, stripEnd),
  ]);

  const emailsRaw = briefing?.payload.emailAttention ?? [];
  const markKeys = [
    ...emailsRaw.map((e) => emailKey(day, e)),
    ...(weekendRow ? weekendRow.payload.promotions.map((p) => dealKey(weekendRow.weekOf, p)) : []),
    ...(weekendRow ? weekendRow.payload.readings.map((r) => readKey(weekendRow.weekOf, r)) : []),
  ];
  const marks = await getMarks(markKeys);

  const emails = buildEmails(day, emailsRaw, marks);
  const openEmails = emails.filter((e) => !e.done);
  const stories = briefing ? buildStories(briefing.payload) : [];
  const groups = groupStories(stories);
  const mustKnow = stories.filter((s) => s.priority === 1);
  const weekend = weekendRow ? buildWeekend(weekendRow, today, marks) : null;
  const weekendLive = weekend && (weekend.deals.length > 0 || weekend.reads.length > 0) ? weekend : null;
  const overdue = (tasks ?? []).filter((t: DashboardTask) => t.overdue);

  const headline: HeadlineView =
    briefing?.payload.headline && briefing.payload.headline.length
      ? briefing.payload.headline
      : fallbackHeadline({ openEmails, overdueTasks: overdue.length, mustKnow, weekend: weekendLive, hasBriefing: !!briefing });

  // Calendar -> timeline events.
  const calendarNames: string[] = [];
  const events: TimelineEvent[] = (calendar ?? []).map((e, i) => {
    const name = e.calendarName ?? "";
    if (!calendarNames.includes(name)) calendarNames.push(name);
    const allDay = !e.start?.dateTime;
    return {
      id: e.id ?? String(i),
      title: e.summary ?? "(No title)",
      start: e.start?.dateTime ?? e.start?.date ?? "",
      end: e.end?.dateTime ?? e.end?.date ?? "",
      allDay,
      calendarIndex: calendarNames.indexOf(name),
      calendarName: name,
      link: e.htmlLink ?? undefined,
    };
  });
  const now = new Date();
  const nextEvent = events.find((e) => !e.allDay && new Date(e.start) > now);

  // At-a-glance tiles.
  const tiles: Tile[] = [];
  if (isToday) {
    tiles.push(
      nextEvent
        ? {
            label: "Next up",
            value: formatClockMeridiem(new Date(nextEvent.start)).replace(/\s?(AM|PM)$/i, ""),
            sub: `${nextEvent.title} · ${relativeUntil(new Date(nextEvent.start), now)}`,
            href: "#schedule",
            tone: "plain",
          }
        : { label: "Next up", value: calendar ? "Free" : "Off", sub: calendar ? "Nothing else today" : "Calendar not connected", href: "#schedule", tone: "calm" },
    );
  }
  const hot = openEmails.filter((e) => e.hot);
  tiles.push(
    openEmails.length
      ? {
          label: "Replies due",
          value: String(openEmails.length),
          sub: hot.length ? `${hot.length} due within 2 days` : openEmails[0].countdown ? `first due ${openEmails[0].countdown.label.toLowerCase()}` : "no hard deadlines",
          href: "#act",
          tone: hot.length ? "act" : "plain",
        }
      : { label: "Replies due", value: "0", sub: "Inbox clear", href: "#act", tone: "calm" },
  );
  if (isToday) {
    tiles.push(
      overdue.length
        ? { label: "Overdue", value: String(overdue.length), sub: overdue[0].title, href: "#tasks", tone: "act" }
        : { label: "Overdue", value: "0", sub: tasks ? "All caught up" : "TickTick not connected", href: "#tasks", tone: "calm" },
    );
  }
  tiles.push(
    mustKnow.length
      ? { label: "Must know", value: String(mustKnow.length), href: "#know", tone: "plain", badges: [...new Set(mustKnow.map((s) => s.topic))] }
      : { label: "Must know", value: "0", sub: briefing ? "Quiet news day" : "No briefing", href: "#briefing", tone: "calm" },
  );
  if (weekendLive) {
    tiles.push({
      label: "Weekend briefing",
      value: `${weekendLive.deals.length}+${weekendLive.reads.filter((r) => !r.done).length}`,
      sub: "deals · unread reads",
      href: "#weekend",
      tone: "gold",
      wide: tiles.length % 2 === 0,
    });
  }

  const stripDays: StripDay[] = [];
  for (let d = stripStart; d <= stripEnd; d = addDays(d, 1)) {
    const key = keyToString(d);
    stripDays.push({
      date: key,
      dow: weekdayShort(d),
      num: String(d.getUTCDate()),
      selected: key === dateStr,
      hasBriefing: strip.briefingDays.has(key),
      weekend: strip.weekendDays.has(key),
      href: key === keyToString(today) ? "/" : `/?date=${key}`,
    });
  }

  const weekendRange = weekendRow ? `${weekdayShort(weekendRow.weekOf)} ${shortDate(weekendRow.weekOf)} to Sun ${shortDate(addDays(weekendRow.weekOf, 1))}` : "";

  return {
    tz: TIMEZONE,
    day,
    dateStr,
    isToday,
    eyebrow: eyebrowDate(day),
    headline,
    tiles,
    events,
    calendarConnected: calendar !== null,
    tasks,
    emails,
    hasBriefing: !!briefing,
    mustKnow,
    groups,
    weekend: weekendLive,
    weekendRange,
    stripDays,
    syncedAt: briefing ? formatClockMeridiem(briefing.updatedAt) : null,
    nowIso: now.toISOString(),
  };
}
