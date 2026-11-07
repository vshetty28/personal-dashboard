"use client";

import { useState, useTransition } from "react";
import { OpenInAI } from "./OpenInAI";
import { setMark } from "@/app/actions";
import type { WeekendView } from "@/lib/view";

const TYPE_LABELS: Record<string, string> = {
  paper: "Paper",
  preprint: "Preprint",
  report: "Report",
  analysis: "Analysis",
  industry: "Industry",
};

/**
 * Daily source snapshots or a legacy weekend briefing.
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
        await setMark({ key, kind, date: key.split(":")[1], on });
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
    <div id="weekend" className="mt-4 space-y-4 scroll-mt-6">
      {deals.length > 0 && (
        <section id="deals" aria-label="Deals" className="min-w-0 scroll-mt-6 rounded-2xl border border-gold-line bg-gold-bg p-4 md:p-[22px]">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold text-gold md:text-[17px]">Deals</h2>
            <span className="text-[12.5px] text-dim">{rangeLabel}</span>
            <span className="text-[12.5px] text-dim md:ml-auto">{deals.length} {deals.length === 1 ? "deal" : "deals"}</span>
          </div>
          <div className="scroll-gold flex gap-2.5 overflow-x-auto pb-2.5 md:block md:max-h-[236px] md:overflow-x-visible md:overflow-y-auto md:pr-1.5 md:pb-0">
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
        </section>
      )}
      {weekend.reads.length > 0 && (
        <section id="readings" aria-label="Readings" className="min-w-0 scroll-mt-6 rounded-2xl border border-line bg-surface p-4 md:p-[22px]">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold md:text-[17px]">Readings</h2>
            <span className="text-[12.5px] text-dim">{rangeLabel}</span>
            <span className="text-[12.5px] text-dim md:ml-auto">{unread} unread</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {weekend.reads.map((r) => {
                const done = isRead(r.key, r.done);
                return (
                  <article
                    key={r.key}
                    className={
                      "flex min-w-0 flex-col gap-2 rounded-xl bg-paper p-3.5 text-paper-ink md:p-4 " +
                      (done ? "opacity-55" : "")
                    }
                  >
                    <div className="flex items-center gap-2 text-xs">
                      {r.minutes ? (
                        <span className="rounded-[5px] bg-paper-ink px-1.5 py-0.5 font-mono font-semibold text-paper">
                          {r.minutes}m
                        </span>
                      ) : null}
                      <span className="truncate text-paper-dim">
                        {r.type ? `${TYPE_LABELS[r.type] ?? r.type} · ` : ""}
                        {r.source}
                      </span>
                    </div>
                    <h3 className={"font-serif text-[15.5px] leading-[1.3] font-semibold md:text-[17px] " + (done ? "line-through" : "")}>
                      <a href={r.url} target="_blank" rel="noreferrer">
                        {r.title}
                      </a>
                    </h3>
                    <p className="text-[12.5px] leading-snug text-[#4A463D] md:text-[13px]">{r.why}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleRead(r.key, r.done)}
                      className="self-start rounded-md bg-paper-ink px-2.5 py-1.5 text-xs font-medium text-paper"
                    >
                      {done ? "Mark unread" : "Mark read"}
                    </button>
                    <OpenInAI prompt={[
                      "Help me understand this reading and go deeper.",
                      "",
                      `Title: ${r.title}`,
                      `Source: ${r.source} (${r.url})`,
                      `Why it was recommended: ${r.why}`,
                      "",
                      "Use the source link to explain the main claims, evidence, limitations, and practical implications. Distinguish what the source says from your own analysis. If you cannot access it, say so and ask me to paste the text.",
                    ].join("\n")} />
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
