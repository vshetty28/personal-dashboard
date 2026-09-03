import { db } from "@/lib/db";
import { startOfTodayUTC, parseDateParam, formatDateParam } from "@/lib/date";
import { getTodaysCalendarEvents } from "@/lib/google";
import { getTodaysTickTickTasks } from "@/lib/ticktick";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { TasksCard } from "@/components/dashboard/TasksCard";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { DateNav } from "@/components/dashboard/DateNav";
import { BriefingList } from "@/components/dashboard/BriefingList";
import { EmailAttentionSection } from "@/components/dashboard/EmailAttentionSection";
import type { BriefingPayload } from "@/lib/digest-types";

// This page has no dynamic API calls of its own (cookies/headers), so without
// this Next.js would statically render it once and cache the result — stale
// forever, since the whole point is to reflect data pushed after that render.
export const dynamic = "force-dynamic";

async function getBriefing(date: Date): Promise<BriefingPayload | null> {
  try {
    const briefing = await db.briefing.findUnique({ where: { date } });
    return (briefing?.payload as BriefingPayload) ?? null;
  } catch (err) {
    console.error("Failed to load briefing", err);
    return null;
  }
}

export default async function DashboardPage(props: PageProps<"/">) {
  const { date: dateParam } = await props.searchParams;
  const selectedDate = parseDateParam(Array.isArray(dateParam) ? dateParam[0] : dateParam);
  const isToday = selectedDate.getTime() === startOfTodayUTC().getTime();
  const dateStr = formatDateParam(selectedDate);

  const [briefing, calendarEvents, tasks] = await Promise.all([
    getBriefing(selectedDate),
    isToday ? getTodaysCalendarEvents().catch(() => null) : Promise.resolve(null),
    isToday ? getTodaysTickTickTasks().catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-2xl font-medium text-foreground">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </h1>
          <div className="flex items-center gap-3">
            <DateNav date={dateStr} isToday={isToday} />
            <SignOutButton />
          </div>
        </header>

        {isToday && (
          <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CalendarCard connected={calendarEvents !== null} events={calendarEvents ?? []} />
            <TasksCard connected={tasks !== null} tasks={tasks ?? []} />
          </div>
        )}

        <div className="mb-10">
          <EmailAttentionSection date={dateStr} items={briefing?.emailAttention ?? []} />
        </div>

        {!briefing ? (
          <p className="text-sm text-muted-foreground">No briefing for this day.</p>
        ) : (
          <BriefingList topics={briefing.topics} />
        )}
      </div>
    </main>
  );
}
