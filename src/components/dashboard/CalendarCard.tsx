import { ExternalLink } from "lucide-react";
import { Card, EmptyState, ConnectLink } from "./Card";
import type { CalendarEvent } from "@/lib/google";

function formatTime(dt?: string | null) {
  if (!dt) return "All day";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CalendarCard({
  connected,
  events,
}: {
  connected: boolean;
  events: CalendarEvent[];
}) {
  const calendarCount = new Set(events.map((e) => e.calendarName)).size;

  return (
    <Card title="Today's Calendar">
      {!connected ? (
        <ConnectLink href="/api/integrations/google/connect" label="Connect Google Calendar" />
      ) : events.length === 0 ? (
        <EmptyState>Nothing on the calendar today.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-baseline gap-3 text-sm">
              <span className="w-20 shrink-0 text-muted-foreground">
                {formatTime(e.start?.dateTime ?? e.start?.date)}
              </span>
              {e.htmlLink ? (
                <a
                  href={e.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-foreground/90 hover:underline"
                >
                  {e.summary ?? "(No title)"}
                  <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                </a>
              ) : (
                <span className="text-foreground/90">{e.summary ?? "(No title)"}</span>
              )}
              {calendarCount > 1 && (
                <span className="text-xs text-muted-foreground">{e.calendarName}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
