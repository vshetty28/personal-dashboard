import type { BriefingTopic } from "@/lib/digest-types";
import { TOPIC_META, describeMove } from "@/lib/topics";

/** The two-letter colored badge that identifies a topic everywhere on the dashboard. */
export function TopicBadge({ topic, size = "md" }: { topic: BriefingTopic; size?: "sm" | "md" }) {
  const meta = TOPIC_META[topic];
  return (
    <span
      aria-label={meta.label}
      title={meta.label}
      className={
        "inline-flex shrink-0 items-center justify-center rounded-md font-mono font-bold text-canvas " +
        (size === "sm" ? "h-[18px] w-[22px] text-[9.5px]" : "h-[22px] w-6 text-[10.5px]")
      }
      style={{ background: meta.hue }}
    >
      {meta.code}
    </span>
  );
}

export function MoveTag({ move, className = "" }: { move?: string; className?: string }) {
  const m = describeMove(move);
  if (!m) return null;
  return (
    <span className={"shrink-0 font-mono text-xs font-semibold " + className} style={{ color: m.color }}>
      {m.text}
    </span>
  );
}

export function TickerTag({ ticker }: { ticker?: string }) {
  if (!ticker) return null;
  return <span className="shrink-0 rounded-[5px] bg-raised px-1.5 py-px font-mono text-xs font-semibold">{ticker}</span>;
}
