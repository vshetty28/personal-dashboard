import { Badge } from "@/components/ui/badge";
import type { EmailAttentionItem } from "@/lib/digest-types";

function EmailRow({ item }: { item: EmailAttentionItem }) {
  return (
    <li className="border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-medium text-foreground">{item.subject}</p>
          <p className="text-xs text-muted-foreground">{item.sender}</p>
        </div>
        {item.deadline && (
          <Badge variant="outline" className="shrink-0 border-amber-500/30 text-amber-500">
            {item.deadline}
          </Badge>
        )}
      </div>
      <p className="mt-2 text-sm text-foreground/90">{item.whyItMatters}</p>
      <p className="mt-1 text-sm font-medium text-primary">→ {item.nextAction}</p>
    </li>
  );
}

export function EmailAttentionSection({ items }: { items: EmailAttentionItem[] }) {
  return (
    <section>
      <h2 className="font-heading mb-4 text-lg font-medium text-foreground">Email Attention</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs your attention.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <EmailRow key={i} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
