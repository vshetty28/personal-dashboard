import { loadDay } from "@/lib/load-day";
import { TopBar } from "@/components/dashboard/TopBar";
import { BriefingBrowser } from "@/components/dashboard/Stories";
import { MobileNav } from "@/components/dashboard/MobileNav";

export const dynamic = "force-dynamic";

/** The full briefing for a day, filterable by topic. The phone's Briefing tab. */
export default async function BriefingPage(props: PageProps<"/briefing">) {
  const { date } = await props.searchParams;
  const d = await loadDay(date, { live: false });
  const total = d.groups.reduce((n, g) => n + g.count, 0);

  return (
    <div className="min-h-screen pb-28 md:pb-14">
      <TopBar
        days={d.stripDays.map((s) => ({ ...s, href: s.href.replace(/^\/(\?|$)/, "/briefing$1") }))}
        syncedAt={d.syncedAt}
      />
      <main className="mx-auto max-w-[1440px] px-5 md:px-12">
        <div className="pt-6 md:pt-8">
          <div className="font-mono text-xs font-semibold tracking-[0.1em] text-dim">{d.eyebrow}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight font-semibold tracking-[-0.025em]">Briefing</h1>
          <p className="mt-1 text-[13.5px] text-dim">
            {d.hasBriefing
              ? `${total} stories · ${d.mustKnow.length} must know${d.syncedAt ? ` · ${d.syncedAt}` : ""}`
              : "No briefing for this day."}
          </p>
        </div>
        {d.hasBriefing && <BriefingBrowser groups={d.groups} />}
      </main>
      <MobileNav date={d.isToday ? undefined : d.dateStr} />
    </div>
  );
}
