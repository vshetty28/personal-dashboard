import { db } from "@/lib/db";
import { startOfTodayUTC, parseDateParam, formatDateParam } from "@/lib/date";
import { getTodaysCalendarEvents } from "@/lib/google";
import { getTodaysTickTickTasks } from "@/lib/ticktick";
import { EmailDigestCard } from "@/components/dashboard/EmailDigestCard";
import { NewsDigestCard } from "@/components/dashboard/NewsDigestCard";
import { PortfolioCard } from "@/components/dashboard/PortfolioCard";
import { CalendarCard } from "@/components/dashboard/CalendarCard";
import { TasksCard } from "@/components/dashboard/TasksCard";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { DateNav } from "@/components/dashboard/DateNav";
import { Card, EmptyState } from "@/components/dashboard/Card";
import type {
  EmailDigestPayload,
  NewsDigestPayload,
  PortfolioDigestPayload,
} from "@/lib/digest-types";

// This page has no dynamic API calls of its own (cookies/headers), so without
// this Next.js would statically render it once and cache the result — stale
// forever, since the whole point is to reflect data pushed after that render.
export const dynamic = "force-dynamic";

async function getDigest<T>(type: "EMAIL" | "NEWS" | "PORTFOLIO", date: Date): Promise<T | null> {
  try {
    const digest = await db.digest.findUnique({
      where: { type_date: { type, date } },
    });
    return (digest?.payload as T) ?? null;
  } catch (err) {
    console.error(`Failed to load ${type} digest`, err);
    return null;
  }
}

export default async function DashboardPage(props: PageProps<"/">) {
  const { date: dateParam } = await props.searchParams;
  const selectedDate = parseDateParam(Array.isArray(dateParam) ? dateParam[0] : dateParam);
  const isToday = selectedDate.getTime() === startOfTodayUTC().getTime();

  const [emailDigest, newsDigest, portfolioDigest, calendarEvents, tasks] = await Promise.all([
    getDigest<EmailDigestPayload>("EMAIL", selectedDate),
    getDigest<NewsDigestPayload>("NEWS", selectedDate),
    getDigest<PortfolioDigestPayload>("PORTFOLIO", selectedDate),
    isToday ? getTodaysCalendarEvents().catch(() => null) : Promise.resolve(null),
    isToday ? getTodaysTickTickTasks().catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
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
            <DateNav date={formatDateParam(selectedDate)} isToday={isToday} />
            <SignOutButton />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {isToday ? (
            <>
              <CalendarCard connected={calendarEvents !== null} events={calendarEvents ?? []} />
              <TasksCard connected={tasks !== null} tasks={tasks ?? []} />
            </>
          ) : (
            <div className="md:col-span-2">
              <Card title="Calendar & Tasks">
                <EmptyState>
                  These reflect live state, not history — only shown for today.
                </EmptyState>
              </Card>
            </div>
          )}
          <PortfolioCard payload={portfolioDigest} />
          <EmailDigestCard payload={emailDigest} />
          <div className="md:col-span-2">
            <NewsDigestCard payload={newsDigest} />
          </div>
        </div>
      </div>
    </main>
  );
}
