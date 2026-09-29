"use client";

import { useState, useTransition } from "react";
import { setMark } from "@/app/actions";
import type { WeekendView } from "@/lib/view";

/**
 * Only rendered while a weekend briefing is live (Saturday through Sunday
 * night). Gold = deals, cream "paper" cards = reading, used nowhere else.
 */
export function WeekendBriefing({ weekend, rangeLabel }: { weekend: WeekendView; rangeLabel: string }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [readOverrides, setReadOverrides] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const deals = weekend.deals.filter((d) => !dismissed.has(d.key));
  const isRead = (key: string, stored: boolean) => readOverrides[key] ?? stored;

  function save(key: string, kind: "deal" | "read", on: boolean, undo: () => void) {
    startTransition(async () => {
      try {
        await setMark({ key, kind, date: weekend.weekOf, on });
      } catch {
        undo();
      }
    });
  }

  function dismiss(key: string) {
    setDismissed((s) => new Set(s).add(key));
    save(key, "deal", true, () =>
      setDismissed((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      }),
    );
  }

  function toggleRead(key: string, stored: boolean) {
    const next = !isRead(key, stored);
    setReadOverrides((o) => ({ ...o, [key]: next }));
    save(key, "read", next, () => setReadOverrides((o) => ({ ...o, [key]: !next })));
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); the code is visible anyway.
    }
  }

  if (deals.length === 0 && weekend.reads.length === 0) return null;
  const unread = weekend.reads.filter((r) => !isRead(r.key, r.done)).length;

  return (
    <section
      id="weekend"
      aria-label="Weekend briefing"
      className="-mx-1 mt-4 scroll-mt-6 rounded-2xl border border-gold-line bg-gold-bg py-4 pl-4 md:mx-0 md:px-[22px] md:pt-[18px]"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pr-4 md:pr-0">
        <span className="flex h-[21px] items-center rounded-[5px] bg-gold px-2 text-[10.5px] font-bold tracking-[0.08em] text-canvas">
          WEEKEND
        </span>
        <h2 className="text-base font-semibold md:text-[17px]">Weekend briefing</h2>
        <span className="text-[12.5px] text-dim md:text-[13px]">{rangeLabel} · stays up all weekend</span>
        <span className="text-[12.5px] text-dim md:ml-auto md:text-[13px]">
          {deals.length} {deals.length === 1 ? "deal" : "deals"} · {unread} unread
        </span>
      </div>

      <div className="mt-3.5 grid gap-4 md:grid-cols-[minmax(0,500px)_minmax(0,1fr)] md:gap-6">
        {deals.length > 0 && (
          <div className="min-w-0">
            <div className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-gold uppercase">Deals</div>
            {/* Phone: a sideways rail of cards. Desktop: a list that scrolls past four. */}
            <div className="scroll-gold flex gap-2.5 overflow-x-auto pr-4 pb-2.5 md:block md:max-h-[236px] md:overflow-x-visible md:overflow-y-auto md:pr-1.5 md:pb-0">
              {deals.map((d) => (
                <div
                  key={d.key}
                  className="flex w-[176px] shrink-0 flex-col gap-1.5 rounded-xl border border-gold-line bg-gold-card p-3.5 md:w-auto md:flex-row md:items-center md:gap-3.5 md:rounded-none md:border-x-0 md:border-t md:border-b-0 md:border-[#2E2818] md:bg-transparent md:px-0 md:py-3"
                >
                  <span className="text-[21px] font-bold tracking-[-0.02em] text-gold md:w-[110px] md:shrink-0 md:text-xl">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer">
                        {d.offer}
                      </a>
                    ) : (
                      d.offer
                    )}
                  </span>
                  <div className="min-w-0 md:flex-1">
                    <div className="truncate text-[13px] font-semibold md:text-sm">{d.merchant}</div>
                    {d.detail && <div className="truncate text-xs text-dim md:text-[12.5px]">{d.detail}</div>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 md:mt-0 md:shrink-0 md:flex-nowrap">
                    {d.expires && (
                      <span
                        className={
                          "rounded-md px-2 py-0.5 text-[11.5px] font-semibold md:text-xs " +
                          (d.endsToday ? "bg-act-chip text-act" : "bg-[#332C1C] text-fg-2")
                        }
                      >
                        {d.expires}
                      </span>
                    )}
                    {d.code && (
                      <button
                        type="button"
                        onClick={() => copy(d.code!)}
                        aria-label={`Copy code ${d.code}`}
                        className="h-[30px] rounded-[7px] border border-dashed border-[#54441C] px-2 font-mono text-[12.5px] font-semibold"
                      >
                        {copied === d.code ? "Copied" : d.code}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => dismiss(d.key)}
                      className="h-[30px] px-1.5 text-xs text-dim hover:text-fg"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {weekend.reads.length > 0 && (
          <div className="min-w-0">
            <div className="mb-2.5 text-[11px] font-semibold tracking-[0.1em] text-paper uppercase">Reading</div>
            <div className="scroll-gold flex gap-3 overflow-x-auto pr-4 pb-2.5 md:pr-0">
              {weekend.reads.map((r) => {
                const done = isRead(r.key, r.done);
                return (
                  <article
                    key={r.key}
                    className={
                      "flex w-[230px] shrink-0 flex-col gap-2 rounded-xl bg-paper p-3.5 text-paper-ink md:w-[250px] md:p-4 " +
                      (done ? "opacity-55" : "")
                    }
                  >
                    <div className="flex items-center gap-2 text-xs">
                      {r.minutes ? (
                        <span className="rounded-[5px] bg-paper-ink px-1.5 py-0.5 font-mono font-semibold text-paper">
                          {r.minutes}m
                        </span>
                      ) : null}
                      <span className="truncate text-paper-dim">{r.source}</span>
                    </div>
                    <h3 className={"font-serif text-[15.5px] leading-[1.3] font-semibold md:text-[17px] " + (done ? "line-through" : "")}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title}
                      </a>
                    </h3>
                    <p className="text-[12.5px] leading-snug text-[#4A463D] md:text-[13px]">{r.why}</p>
                    <button
                      type="button"
                      onClick={() => toggleRead(r.key, r.done)}
                      className="mt-auto self-start rounded-md bg-paper-ink px-2.5 py-1.5 text-xs font-medium text-paper"
                    >
                      {done ? "Mark unread" : "Mark read"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
