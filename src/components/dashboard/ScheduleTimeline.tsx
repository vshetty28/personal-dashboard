"use client";

import { useEffect, useState } from "react";

export type TimelineEvent = {
  id: string;
  title: string;
  /** ISO instants; for all-day events these are ignored. */
  start: string;
  end: string;
  allDay: boolean;
  /** Index of the calendar it came from, picks a fill (first calendar is neutral). */
  calendarIndex: number;
  calendarName?: string;
  link?: string;
};

const CAL_FILLS = [
  { bg: "#23221F", bd: "#34322D" },
  { bg: "#151C2E", bd: "#2B3D66" },
  { bg: "#122324", bd: "#23504C" },
  { bg: "#1D1929", bd: "#3E3363" },
];

function hourIn(tz: string, iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, Number(x.value)]),
  );
  return p.hour + p.minute / 60;
}

function clock(tz: string, iso: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(/\s?(AM|PM)$/i, "");
}

function hourLabel(h: number) {
  const hh = h % 24;
  return `${hh % 12 === 0 ? 12 : hh % 12}${hh < 12 ? "a" : "p"}`;
}

function until(targetIso: string, now: Date) {
  const mins = Math.round((new Date(targetIso).getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  return `in ${Math.floor(mins / 60)} hr${mins % 60 >= 10 && mins < 180 ? ` ${mins % 60} min` : ""}`;
}

export function ScheduleTimeline({
  tz,
  events,
  nowIso,
  connected,
}: {
  tz: string;
  events: TimelineEvent[];
  nowIso: string;
  connected: boolean;
}) {
  // Starts from the server's "now" so the first client render matches the HTML, then ticks every minute.
  const [now, setNow] = useState(() => new Date(nowIso));
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!connected) {
    return (
      <section id="schedule" className="mt-4 rounded-[14px] border border-line bg-surface px-5 py-4 text-sm text-fg-2">
        Calendar isn&apos;t connected.{" "}
        <a href="/api/integrations/google/connect" className="font-medium text-fg underline underline-offset-4">
          Connect Google Calendar
        </a>
      </section>
    );
  }

  const timed = events
    .filter((e) => !e.allDay)
    .map((e) => ({ ...e, s: hourIn(tz, e.start), e: Math.max(hourIn(tz, e.end), hourIn(tz, e.start) + 0.25) }))
    // Events crossing midnight end "early" in local hours; clamp them to the end of the day.
    .map((e) => (e.e < e.s ? { ...e, e: 24 } : e));
  const allDay = events.filter((e) => e.allDay);

  const startH = Math.min(8, ...timed.map((e) => Math.floor(e.s)));
  const endH = Math.max(22, ...timed.map((e) => Math.ceil(e.e)));
  const span = endH - startH;
  const pct = (h: number) => `${((Math.min(Math.max(h, startH), endH) - startH) / span) * 100}%`;
  const nowH = hourIn(tz, now);
  const next = timed.find((e) => new Date(e.start) > now);
  const later = timed.filter((e) => next && new Date(e.start) > new Date(next.start));
  const hours = Array.from({ length: span + 1 }, (_, i) => startH + i);

  return (
    <section id="schedule" aria-label="Schedule" className="mt-4 scroll-mt-6 rounded-[14px] border border-line bg-surface px-4 pt-3.5 pb-4 md:px-6 md:pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-dim uppercase">Schedule</span>
        <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-[12.5px] text-dim">
          {events.length} {events.length === 1 ? "event" : "events"} · Google Calendar
        </a>
      </div>

      {allDay.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {allDay.map((e) => (
            <span key={e.id} className="rounded-md bg-raised px-2 py-1 text-xs text-fg-2">
              All day · {e.title}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-2.5 h-11 md:h-24">
        {hours.map((h, i) => (
          <div key={h} className={i % 3 === 0 ? "" : "hidden md:block"}>
            <span
              className="absolute top-0 font-mono text-[10.5px] text-faint md:text-[11px]"
              style={{ left: pct(h), transform: i === hours.length - 1 ? "translateX(-100%)" : undefined }}
            >
              {hourLabel(h)}
            </span>
            <span className="absolute top-4 bottom-0 w-px bg-line md:top-[18px]" style={{ left: pct(h) }} />
          </div>
        ))}
        <div className="absolute top-4 left-0 h-7 bg-black/35 md:top-[18px] md:h-[78px]" style={{ width: pct(nowH) }} />
        {timed.map((e) => {
          const fill = CAL_FILLS[e.calendarIndex % CAL_FILLS.length];
          const isNext = next?.id === e.id;
          const body = (
            <>
              <div className="hidden truncate text-[13px] font-semibold md:block">{e.title}</div>
              <div className={"mt-0.5 hidden font-mono text-[11.5px] whitespace-nowrap md:block " + (isNext ? "text-fg" : "text-dim")}>
                {clock(tz, e.start)}
                {isNext ? ` · ${until(e.start, now)}` : ""}
              </div>
            </>
          );
          const cls =
            "absolute top-[22px] h-[18px] overflow-hidden rounded-[5px] border md:top-[26px] md:h-[62px] md:rounded-[9px] md:px-2.5 md:py-2";
          const style = {
            left: `calc(${pct(e.s)} + 2px)`,
            width: `calc(${((e.e - e.s) / span) * 100}% - 4px)`,
            background: fill.bg,
            borderColor: isNext ? "#F2F0EA" : fill.bd,
          };
          return e.link ? (
            <a key={e.id} href={e.link} target="_blank" rel="noreferrer" title={e.title} className={cls} style={style}>
              {body}
            </a>
          ) : (
            <div key={e.id} title={e.title} className={cls} style={style}>
              {body}
            </div>
          );
        })}
        {nowH >= startH && nowH <= endH && (
          <>
            <div className="absolute top-3.5 bottom-0 w-0.5 bg-fg md:top-4" style={{ left: pct(nowH) }} />
            <div
              className="absolute top-2.5 hidden size-2.5 -translate-x-1 rounded-full bg-fg md:top-3 md:block"
              style={{ left: pct(nowH) }}
            />
          </>
        )}
      </div>

      {/* Phone: the blocks are too small for labels, so spell out what's next. */}
      <div className="mt-3 md:hidden">
        {next ? (
          <>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-sm font-semibold">{clock(tz, next.start)}</span>
              <span className="truncate text-[15px] font-semibold">{next.title}</span>
              <span className="ml-auto shrink-0 text-xs text-dim">{until(next.start, now)}</span>
            </div>
            {later.length > 0 && (
              <div className="mt-1 text-[13px] text-dim">
                Then {later.map((e) => `${e.title} ${clock(tz, e.start)}`).join(" · ")}
              </div>
            )}
          </>
        ) : (
          <div className="text-[13px] text-dim">{timed.length ? "Nothing else on the calendar today." : "Nothing on the calendar today."}</div>
        )}
      </div>
    </section>
  );
}
