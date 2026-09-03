import { Card, EmptyState } from "./Card";
import type { EmailDigestPayload } from "@/lib/digest-types";

export function EmailDigestCard({ payload }: { payload: EmailDigestPayload | null }) {
  return (
    <Card title="Top Emails">
      {!payload || payload.items.length === 0 ? (
        <EmptyState>No digest for this day.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {payload.items.map((item, i) => (
            <li key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-foreground hover:underline"
              >
                {item.subject}
              </a>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.from}</p>
              <p className="mt-1 text-sm text-foreground/70">{item.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
