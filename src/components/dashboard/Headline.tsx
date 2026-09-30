import type { HeadlineTone } from "@/lib/digest-types";
import { ACT, GOLD, TOPIC_META } from "@/lib/topics";

function toneColor(tone?: HeadlineTone): string | undefined {
  if (!tone) return undefined;
  if (tone === "action") return ACT;
  if (tone === "weekend") return GOLD;
  return TOPIC_META[tone]?.hue;
}

/** Date eyebrow + the one-sentence synthesis of the day, with important phrases in their cue color. */
export function Headline({ eyebrow, segments }: { eyebrow: string; segments: { text: string; tone?: HeadlineTone }[] }) {
  return (
    <section className="pt-6 md:pt-8">
      <div className="font-mono text-xs font-semibold tracking-[0.1em] text-dim md:text-[12.5px]">{eyebrow}</div>
      <p className="mt-2.5 max-w-[1080px] text-xl leading-[1.45] font-medium tracking-[-0.01em] text-fg-2 md:text-[26px] md:leading-[1.42]">
        {segments.map((s, i) => {
          const color = toneColor(s.tone);
          return (
            <span key={i} style={color ? { color, fontWeight: 600 } : undefined}>
              {s.text}
            </span>
          );
        })}
      </p>
    </section>
  );
}
