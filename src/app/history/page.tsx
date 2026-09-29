import Link from "next/link";
import { getHistory } from "@/lib/data";
import { RETENTION_DAYS, isDateString, keyFromString, keyToString, shortDate, todayKey, weekday, weekdayShort } from "@/lib/time";
import { TopBar } from "@/components/dashboard/TopBar";
import { MobileNav } from "@/components/dashboard/MobileNav";

export const dynamic = "force-dynamic";

const LEGEND = [
  { label: "Briefing", color: "#F2F0EA" },
  { label: "Emails flagged", color: "#FF7B5C" },
  { label: "Weekend briefing", color: "#F4C152" },
];

/** The last 30 days as a calendar. Anything older has been deleted by the nightly sweep. */
export default async function HistoryPage(props: PageProps<"/history">) {
  const { day: dayParam } = await props.searchParams;
  const days = await getHistory();
  const today = keyToString(todayKey());
  const raw = Array.isArray(dayParam) ? dayParam[0] : dayParam;
  const selected = days.find((d) => d.date === raw) ?? days[days.length - 1];

  // Pad the grid so columns line up Monday..Sunday.
  const first = keyFromString(days[0].date);
  const lead = (weekday(first) + 6) % 7;
  const cells: ({ kind: "pad" } | { kind: "day"; d: (typeof days)[number] })[] = [
    ...Array.from({ length: lead }, () => ({ kind: "pad" as const })),
    ...days.map((d) => ({ kind: "day" as const, d })),
  ];
  const oldest = days[0].date;
  const selectedKey = keyFromString(selected.date);

  return (
    <div className="min-h-screen pb-28 md:pb-14">
      <TopBar days={[]} syncedAt={null} />
      <main className="mx-auto max-w-[760px] px-5 md:px-12">
        <div className="pt-6 md:pt-8">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em]">History</h1>
          <p className="mt-1 text-[13.5px] text-dim">
            The last {RETENTION_DAYS} days. Older days are deleted each night.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 text-[12.5px] text-fg-2">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className="size-[7px] rounded-full" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>

        <div className="mt-4 rounded-[14px] border border-line bg-surface px-2.5 py-3.5">
          <div className="mb-1.5 grid grid-cols-7 text-center text-[11px] font-semibold tracking-[0.06em] text-dim">
            {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((c, i) => {
              if (c.kind === "pad") return <span key={`pad-${i}`} />;
              const { d } = c;
              const isSel = d.date === selected.date;
              const dotColor = (color: string) => (isSel ? "#0F0F0E" : color);
              const key = keyFromString(d.date);
              return (
                <Link
                  key={d.date}
                  href={`/history?day=${d.date}`}
                  aria-label={`${weekdayShort(key)} ${shortDate(key)}`}
                  aria-current={isSel ? "date" : undefined}
                  className={
                    "mx-0.5 flex h-[54px] flex-col items-center justify-center gap-1.5 rounded-[10px] " +
                    (isSel ? "bg-fg text-canvas" : "hover:bg-raised")
                  }
                >
                  <span className={"font-mono text-sm " + (d.date === today ? "font-bold" : "")}>{key.getUTCDate()}</span>
                  <span className="flex h-[5px] gap-0.5">
                    {d.hasBriefing && <span className="size-[5px] rounded-full" style={{ background: dotColor("#F2F0EA") }} />}
                    {d.emails > 0 && <span className="size-[5px] rounded-full" style={{ background: dotColor("#FF7B5C") }} />}
                    {d.weekend && <span className="size-[5px] rounded-full" style={{ background: dotColor("#F4C152") }} />}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {selected.date === oldest && selected.date !== today && (
          <p className="mt-3 rounded-[11px] bg-act-bg px-3.5 py-3 text-[13.5px] font-medium text-act">
            {shortDate(selectedKey)} is the oldest day kept and drops off tonight.
          </p>
        )}

        <section className="mt-4 rounded-[14px] border border-line bg-surface p-[18px]">
          <h2 className="text-[17px] font-semibold tracking-[-0.015em]">
            {selected.date === today ? "Today, " : ""}
            {weekdayShort(selectedKey)} {shortDate(selectedKey)}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat n={selected.stories} label="briefing stories" className="bg-raised text-fg" />
            <Stat n={selected.mustKnow} label="must know" className="bg-raised text-fg" />
            <Stat n={selected.emails} label="emails flagged" className="bg-act-bg text-act" />
            <Stat
              n={selected.weekend ? selected.weekend.deals + selected.weekend.reads : 0}
              label="weekend deals + reads"
              className="bg-gold-bg text-gold"
            />
          </div>
          <Link
            href={selected.date === today ? "/" : `/?date=${selected.date}`}
            className="mt-3.5 flex h-[46px] items-center justify-center rounded-[10px] bg-fg text-[15px] font-medium text-canvas"
          >
            Open this day
          </Link>
          {selected.date !== today && (
            <Link
              href={`/briefing?date=${selected.date}`}
              className="mt-2 flex h-[42px] items-center justify-center rounded-[10px] border border-line-strong text-sm text-fg-2"
            >
              Full briefing
            </Link>
          )}
        </section>
        {raw && !isDateString(raw) && <p className="mt-3 text-xs text-faint">Unknown date, showing today.</p>}
      </main>
      <MobileNav />
    </div>
  );
}

function Stat({ n, label, className }: { n: number; label: string; className: string }) {
  return (
    <div className={"rounded-[9px] px-3 py-2.5 " + className}>
      <div className="font-mono text-xl font-semibold">{n}</div>
      <div className="text-[12.5px] text-fg-2">{label}</div>
    </div>
  );
}
