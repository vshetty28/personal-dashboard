"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { setMark } from "@/app/actions";
import type { EmailView } from "@/lib/view";

/**
 * Emails the agent flagged. Each card shows the full summary AND the call to
 * action; the countdown and the action box are the only orange on the card.
 * "Done" is stored server-side, so it's the same on every device.
 */
export function NeedsYou({ emails, hasBriefing }: { emails: EmailView[]; hasBriefing: boolean }) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isDone = (e: EmailView) => overrides[e.key] ?? e.done;
  const open = emails.filter((e) => !isDone(e));
  const done = emails.filter(isDone);

  function toggle(e: EmailView) {
    const next = !isDone(e);
    setOverrides((o) => ({ ...o, [e.key]: next }));
    setError(null);
    startTransition(async () => {
      try {
        await setMark({ key: e.key, kind: "email", date: e.date, on: next });
      } catch {
        setOverrides((o) => ({ ...o, [e.key]: !next }));
        setError("Couldn't save that. Try again.");
      }
    });
  }

  return (
    <section id="act" className="scroll-mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold md:text-lg">
          <span className="size-2 rounded-full bg-act" />
          Needs you
          <span className="font-mono text-[13px] font-medium text-dim">{open.length}</span>
        </h2>
        <a href="readdle-spark://" className="text-[13px] text-dim hover:text-fg">
          Open Spark
        </a>
      </div>

      {error && <p className="mb-2 text-[13px] text-act">{error}</p>}

      {open.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong px-5 py-6 text-sm text-dim">
          {hasBriefing ? "Nothing needs a reply. The agent checked this morning." : "No email summary for this day."}
        </div>
      ) : (
        <div className="scroll-thin flex flex-col gap-2 lg:max-h-[600px] lg:overflow-y-auto lg:pr-1.5">
          {open.map((e) => (
            <article key={e.key} className="shrink-0 rounded-xl border border-line bg-surface p-3.5 md:p-4">
              <div className="flex items-start gap-3 md:gap-3.5">
                {e.countdown ? (
                  <div
                    className={
                      "flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-lg md:h-[58px] md:w-[54px] md:rounded-[9px] " +
                      (e.hot ? "bg-act-chip text-act" : "bg-raised text-fg-2")
                    }
                  >
                    <span className="font-mono text-lg leading-none font-bold md:text-xl">{e.countdown.value}</span>
                    <span className="mt-1 text-[10px] font-semibold tracking-[0.08em] md:text-[10.5px]">{e.countdown.label}</span>
                  </div>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="text-[14.5px] leading-snug font-semibold md:text-[15px]">{e.subject}</h3>
                    <button
                      type="button"
                      onClick={() => toggle(e)}
                      aria-label={`Mark "${e.subject}" done`}
                      className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong text-fg-2 hover:text-fg"
                    >
                      <Check className="size-3.5" strokeWidth={2.6} />
                    </button>
                  </div>
                  <div className="mt-0.5 text-xs text-dim md:text-[12.5px]">
                    {e.sender}
                    {e.category ? ` · ${e.category}` : ""}
                    {e.deadline ? (
                      <span className="ml-2 rounded bg-raised px-1.5 py-px text-fg-2">{e.deadline}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-[13.5px] leading-normal text-fg-2">{e.summary}</p>
              <div className="mt-2.5 flex items-start gap-2 rounded-[9px] border border-act-cta bg-act-bg px-3 py-2.5 text-[13.5px] leading-snug font-medium md:text-sm">
                <ArrowRight className="mt-[3px] size-3.5 shrink-0 text-act" strokeWidth={2.6} />
                <span>{e.next}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      {done.map((e) => (
        <div key={e.key} className="mt-2 flex items-center gap-2 text-[13px] text-faint">
          <button
            type="button"
            onClick={() => toggle(e)}
            aria-label={`Mark "${e.subject}" not done`}
            className="flex size-7 items-center justify-center text-up"
          >
            <CheckCircle2 className="size-4" />
          </button>
          <span className="truncate line-through">{e.subject}</span>
        </div>
      ))}
    </section>
  );
}
