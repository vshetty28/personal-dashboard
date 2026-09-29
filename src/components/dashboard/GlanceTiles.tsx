import type { BriefingTopic } from "@/lib/digest-types";
import { TopicBadge } from "./TopicBadge";

export type Tile = {
  label: string;
  value: string;
  sub?: string;
  href: string;
  /** act = orange (needs you), gold = weekend, calm = zero state, plain = neutral. */
  tone: "act" | "gold" | "calm" | "plain";
  badges?: BriefingTopic[];
  wide?: boolean;
};

const TONES: Record<Tile["tone"], { box: string; label: string; value: string }> = {
  act: { box: "bg-act-bg border-act-line", label: "text-act", value: "text-act" },
  gold: { box: "bg-gold-bg border-gold-line", label: "text-gold", value: "text-gold" },
  calm: { box: "bg-surface border-line", label: "text-dim", value: "text-[#55524B]" },
  plain: { box: "bg-surface border-line", label: "text-dim", value: "text-fg" },
};

/** The at-a-glance row. Big mono numbers; a box only turns orange when something needs you. */
export function GlanceTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <section aria-label="At a glance" className="mt-6 grid grid-cols-2 gap-2 md:flex md:gap-3">
      {tiles.map((t) => {
        const tone = TONES[t.tone];
        return (
          <a
            key={t.label}
            href={t.href}
            className={
              "flex min-w-0 flex-col gap-0.5 rounded-xl border px-3.5 py-3 md:flex-1 md:gap-1 md:rounded-[14px] md:px-[18px] md:py-4 " +
              tone.box +
              (t.wide ? " col-span-2" : "")
            }
          >
            <span className={"text-[10.5px] font-semibold tracking-[0.1em] uppercase md:text-[11px] " + tone.label}>
              {t.label}
            </span>
            <span
              className={
                "font-mono text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[34px] md:leading-[1.1] " +
                tone.value
              }
            >
              {t.value}
            </span>
            <span className="flex min-h-5 items-center gap-1 truncate text-[12.5px] text-fg-2 md:min-h-[22px] md:text-[13px]">
              {t.sub}
              {t.badges?.map((b) => <TopicBadge key={b} topic={b} size="sm" />)}
            </span>
          </a>
        );
      })}
    </section>
  );
}
