import { Card, EmptyState, ConnectLink } from "./Card";
import { Badge } from "@/components/ui/badge";

type Task = { id: string; title: string; projectName: string; overdue: boolean };

export function TasksCard({ connected, tasks }: { connected: boolean; tasks: Task[] }) {
  return (
    <Card title="Tasks">
      {!connected ? (
        <ConnectLink href="/api/integrations/ticktick/connect" label="Connect TickTick" />
      ) : tasks.length === 0 ? (
        <EmptyState>Nothing due today.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-foreground/90">
                {t.title}
                {t.overdue && (
                  <Badge variant="outline" className="border-transparent text-red-500">
                    Overdue
                  </Badge>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{t.projectName}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
