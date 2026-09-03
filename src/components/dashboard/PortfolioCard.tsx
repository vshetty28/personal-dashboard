import { Card, EmptyState } from "./Card";
import { Badge } from "@/components/ui/badge";
import type { PortfolioDigestPayload } from "@/lib/digest-types";

function formatCurrency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function ChangeBadge({ percent }: { percent: number }) {
  const positive = percent >= 0;
  return (
    <Badge
      variant="outline"
      className={positive ? "border-transparent text-green-500" : "border-transparent text-red-500"}
    >
      {positive ? "+" : ""}
      {percent.toFixed(2)}%
    </Badge>
  );
}

export function PortfolioCard({ payload }: { payload: PortfolioDigestPayload | null }) {
  return (
    <Card title="Portfolio">
      {!payload ? (
        <EmptyState>No portfolio snapshot for this day.</EmptyState>
      ) : (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-foreground">
              {formatCurrency(payload.totalValue)}
            </span>
            <ChangeBadge percent={payload.dayChangePercent} />
          </div>
          <ul className="mt-4 space-y-2">
            {payload.holdings.map((h) => (
              <li key={h.ticker} className="flex items-center justify-between text-sm">
                <span className="text-foreground/80">
                  {h.ticker} <span className="text-muted-foreground">· {h.shares}sh</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">{formatCurrency(h.value)}</span>
                  <ChangeBadge percent={h.dayChangePercent} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
