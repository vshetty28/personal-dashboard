import { loadDay } from "@/lib/load-day";
import { TopBar } from "@/components/dashboard/TopBar";
import { Headline } from "@/components/dashboard/Headline";
import { GlanceTiles } from "@/components/dashboard/GlanceTiles";
import { ScheduleTimeline } from "@/components/dashboard/ScheduleTimeline";
import { WeekendBriefing } from "@/components/dashboard/WeekendBriefing";
import { NeedsYou } from "@/components/dashboard/NeedsYou";
import { TasksPanel } from "@/components/dashboard/TasksPanel";
import { ByTopic, MustKnow } from "@/components/dashboard/Stories";
import { MobileNav } from "@/components/dashboard/MobileNav";

// Reads the DB and live APIs on every request; never statically cached.
export const dynamic = "force-dynamic";

export default async function TodayPage(props: PageProps<"/">) {
  const { date } = await props.searchParams;
  const d = await loadDay(date, { live: true });

  return (
    <div className="min-h-screen pb-28 md:pb-14">
      <TopBar days={d.stripDays} syncedAt={d.syncedAt} />
      <main className="mx-auto max-w-[1440px] px-5 md:px-12">
        <Headline eyebrow={d.eyebrow} segments={d.headline} />
        <GlanceTiles tiles={d.tiles} />

        {d.isToday ? (
          <ScheduleTimeline tz={d.tz} events={d.events} nowIso={d.nowIso} connected={d.calendarConnected} />
        ) : (
          <p className="mt-4 rounded-[14px] border border-line bg-surface px-5 py-3.5 text-[13px] text-dim">
            Schedule and tasks are live, so they only show for today.
          </p>
        )}

        {d.weekend && <WeekendBriefing weekend={d.weekend} rangeLabel={d.weekendRange} />}

        {/* Phone order follows the DOM: Needs you, Tasks, Must know, By topic. */}
        <div className="mt-7 grid items-start gap-7 lg:mt-8 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-7">
            <NeedsYou emails={d.emails} hasBriefing={d.hasBriefing} />
            {d.isToday && <TasksPanel tasks={d.tasks} />}
          </div>
          <div className="flex min-w-0 flex-col gap-7">
            <MustKnow stories={d.mustKnow} />
            <ByTopic groups={d.groups} />
            {!d.hasBriefing && <p className="text-sm text-dim">No briefing for this day.</p>}
          </div>
        </div>
      </main>
      <MobileNav date={d.isToday ? undefined : d.dateStr} />
    </div>
  );
}
