import { Card, EmptyState } from "./Card";
import type { NewsDigestPayload } from "@/lib/digest-types";

export function NewsDigestCard({ payload }: { payload: NewsDigestPayload | null }) {
  return (
    <Card title="Tech Sector News">
      {!payload || payload.items.length === 0 ? (
        <EmptyState>No digest for this day.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {payload.items.map((item, i) => (
            <li key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-foreground hover:underline"
              >
                {item.title}
              </a>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.source}</p>
              <p className="mt-1 text-sm text-foreground/70">{item.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
