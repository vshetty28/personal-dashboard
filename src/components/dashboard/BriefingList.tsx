import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BRIEFING_TOPICS,
  TOPIC_LABELS,
  type BriefingNewsItem,
  type BriefingPayload,
  type BriefingTopic,
  type MarketsItem,
} from "@/lib/digest-types";

function isMarketsItem(item: BriefingNewsItem | MarketsItem): item is MarketsItem {
  return "ticker" in item;
}

function ItemRow({ topic, item }: { topic: BriefingTopic; item: BriefingNewsItem | MarketsItem }) {
  return (
    <li className="border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {TOPIC_LABELS[topic]}
        </Badge>
        {isMarketsItem(item) && (
          <Badge variant="secondary" className="font-mono text-xs">
            {item.ticker}
          </Badge>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-base font-medium text-foreground hover:underline"
        >
          {item.title}
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
        </a>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{item.source}</p>
      <p className="mt-2 text-sm text-foreground/90">{item.whyItMatters}</p>
      <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
    </li>
  );
}

export function BriefingList({ topics }: { topics: BriefingPayload["topics"] | undefined }) {
  const rows = BRIEFING_TOPICS.flatMap((topic) =>
    (topics?.[topic] ?? []).map((item) => ({ topic, item })),
  );

  return (
    <section>
      <h2 className="font-heading mb-4 text-lg font-medium text-foreground">Briefing</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing notable across your topics today.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ topic, item }, i) => (
            <ItemRow key={i} topic={topic} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
