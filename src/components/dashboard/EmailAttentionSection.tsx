"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Circle, CheckCircle2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EmailAttentionItem } from "@/lib/digest-types";

const STORAGE_KEY = "email-attention-done";

// A minimal external store over localStorage — useSyncExternalStore needs a
// subscribe/getSnapshot pair rather than setState-in-an-effect, both to avoid
// a hydration mismatch (localStorage doesn't exist during SSR) and to avoid
// the extra render pass a raw effect-based read would cause.
type Listener = () => void;
let listeners: Listener[] = [];

function readRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function toggleDoneKey(key: string) {
  const current = new Set<string>(JSON.parse(readRaw()));
  if (current.has(key)) current.delete(key);
  else current.add(key);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  } catch {
    // localStorage unavailable (private browsing, etc.) — done state just won't persist
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getServerSnapshot() {
  return "[]";
}

function useDoneKeys() {
  const raw = useSyncExternalStore(subscribe, readRaw, getServerSnapshot);
  return useMemo(() => new Set<string>(JSON.parse(raw)), [raw]);
}

function EmailRow({
  item,
  itemKey,
  done,
}: {
  item: EmailAttentionItem;
  itemKey: string;
  done: boolean;
}) {
  if (done) {
    return (
      <li className="flex items-center gap-2 py-1 text-sm">
        <button
          onClick={() => toggleDoneKey(itemKey)}
          aria-label="Mark as not done"
          className="shrink-0 text-primary hover:text-primary/70"
        >
          <CheckCircle2 className="size-4" />
        </button>
        <span className="truncate text-muted-foreground line-through decoration-muted-foreground/50">
          {item.subject}
        </span>
      </li>
    );
  }

  return (
    <li className="border-b border-border pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleDoneKey(itemKey)}
              aria-label="Mark as done"
              className="shrink-0 text-muted-foreground hover:text-primary"
            >
              <Circle className="size-4" />
            </button>
            <p className="text-base font-medium text-foreground">{item.subject}</p>
          </div>
          <p className="mt-0.5 ml-6 text-xs text-muted-foreground">{item.sender}</p>
        </div>
        {item.deadline && (
          <Badge variant="outline" className="shrink-0 border-amber-500/30 text-amber-500">
            {item.deadline}
          </Badge>
        )}
      </div>
      <p className="mt-2 ml-6 text-sm text-foreground/90">{item.whyItMatters}</p>
      <div className="mt-2 ml-6 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
        → {item.nextAction}
      </div>
    </li>
  );
}

export function EmailAttentionSection({ date, items }: { date: string; items: EmailAttentionItem[] }) {
  const doneKeys = useDoneKeys();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-medium text-foreground">Important Emails</h2>
        <a
          href="readdle-spark://"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Mail className="size-3.5" />
          Open Spark
        </a>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs your attention.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item, i) => {
            const itemKey = `${date}:${item.sender}:${item.subject}`;
            return <EmailRow key={i} item={item} itemKey={itemKey} done={doneKeys.has(itemKey)} />;
          })}
        </ul>
      )}
    </section>
  );
}
