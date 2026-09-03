import { ExternalLink } from "lucide-react";
import { Card, EmptyState, ActionLink } from "./Card";
import { Badge } from "@/components/ui/badge";

type Task = { id: string; title: string; projectName: string; overdue: boolean; webLink: string };

export function TasksCard({ connected, tasks }: { connected: boolean; tasks: Task[] }) {
  return (
    <Card title="Tasks">
      {!connected ? (
        <ActionLink href="/api/integrations/ticktick/connect" label="Connect TickTick" />
      ) : tasks.length === 0 ? (
        <div className="space-y-2">
          <EmptyState>Nothing due today.</EmptyState>
          <ActionLink href="https://ticktick.com/webapp" label="Open TickTick" external />
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <a
                href={t.webLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-foreground/90 hover:underline"
              >
                {t.title}
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                {t.overdue && (
                  <Badge variant="outline" className="border-transparent text-red-500">
                    Overdue
                  </Badge>
                )}
              </a>
              <span className="text-xs text-muted-foreground">{t.projectName}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
