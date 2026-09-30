"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { BriefingTopic } from "@/lib/digest-types";
import { TOPIC_META } from "@/lib/topics";
import type { StoryView, TopicGroup } from "@/lib/view";
import { MoveTag, TickerTag, TopicBadge } from "./TopicBadge";

/** Priority-1 story: a tinted card in its topic color with summary and why-it-matters always visible. */
export function MustKnowCard({ story, compact = false }: { story: StoryView; compact?: boolean }) {
  const meta = TOPIC_META[story.topic];
  return (
    <article
      className="flex flex-col gap-2 rounded-xl border p-3.5 md:gap-2.5 md:rounded-[14px] md:p-[18px]"
      style={{ background: meta.tint, borderColor: `${meta.hue}40` }}
    >
      <div className="flex items-center gap-2">
        {compact ? (
          <span className="text-[10.5px] font-bold tracking-[0.1em]" style={{ color: meta.hue }}>
            MUST KNOW
          </span>
        ) : (
          <>
            <TopicBadge topic={story.topic} />
            <span className="text-[11px] font-semibold tracking-[0.08em] uppercase md:text-[11.5px]" style={{ color: meta.hue }}>
              {meta.label}
            </span>
          </>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          <TickerTag ticker={story.ticker} />
          <MoveTag move={story.move} />
        </span>
      </div>
      <h3 className="text-base leading-[1.3] font-semibold tracking-[-0.01em] md:text-lg">
        <a href={story.url} target="_blank" rel="noreferrer" className="hover:underline">
          {story.tldr}
        </a>
      </h3>
      <p className="text-[13px] leading-normal text-fg-2 md:text-[13.5px]">{story.summary}</p>
      <p className="text-[13px] leading-normal text-fg-2">
        <span className="font-semibold" style={{ color: meta.hue }}>
          Why it matters{" "}
        </span>
        {story.why}
      </p>
      <span className="text-xs text-dim">{story.source}</span>
    </article>
  );
}

export function MustKnow({ stories }: { stories: StoryView[] }) {
  if (stories.length === 0) return null;
  return (
    <section id="know" className="scroll-mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold md:text-lg">Must know</h2>
        <span className="hidden text-[13px] text-dim sm:inline">priority 1 from today&apos;s briefing</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
        {stories.map((s) => (
          <MustKnowCard key={s.id} story={s} />
        ))}
      </div>
    </section>
  );
}

/** One story line: takeaway + one-line summary; click to expand the full summary, why, and source. */
export function StoryRow({ story, open, onToggle }: { story: StoryView; open: boolean; onToggle: () => void }) {
  const meta = TOPIC_META[story.topic];
  const low = story.priority === 3;
  return (
    <div className="border-t border-line">
      <button type="button" onClick={onToggle} aria-expanded={open} className="block w-full py-2.5 text-left">
        <div className="flex items-baseline gap-2.5">
          <span className={"flex-1 text-[14px] leading-[1.4] md:text-[14.5px] " + (low ? "font-normal text-fg-2" : "font-medium text-fg")}>
            {story.tldr}
          </span>
          <TickerTag ticker={story.ticker} />
          <MoveTag move={story.move} />
          <ChevronDown
            className={"size-3 shrink-0 text-faint transition-transform " + (open ? "rotate-180" : "")}
            strokeWidth={2.4}
          />
        </div>
        <div className={"mt-0.5 text-[12.5px] leading-[1.45] text-fg-3 md:text-[13px] " + (open ? "" : "truncate")}>
          {story.summary}
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 pb-3">
          <p className="text-[13px] leading-normal text-fg-2">
            <span className="font-semibold" style={{ color: meta.hue }}>
              Why it matters{" "}
            </span>
            {story.why}
          </p>
          <div className="text-xs text-faint">
            {story.source} ·{" "}
            <a href={story.url} target="_blank" rel="noreferrer" className="text-fg-2 underline underline-offset-2">
              Read source
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function useOpenSet() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return [open, toggle] as const;
}

function GroupHeader({ topic, count }: { topic: BriefingTopic; count: number }) {
  return (
    <div className="flex items-center gap-2 pb-2">
      <TopicBadge topic={topic} />
      <span className="text-sm font-semibold">{TOPIC_META[topic].label}</span>
      <span className="ml-auto font-mono text-xs text-faint">{count}</span>
    </div>
  );
}

/** "By topic" on the Today page: every non-must-know story, grouped, each with its summary line. */
export function ByTopic({ groups }: { groups: TopicGroup[] }) {
  const [open, toggle] = useOpenSet();
  if (groups.every((g) => g.count === 0)) return null;
  return (
    <section id="briefing" className="scroll-mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[17px] font-semibold md:text-lg">By topic</h2>
        <span className="hidden text-[13px] text-dim sm:inline">click a story for the full summary</span>
      </div>
      <div className="grid items-start gap-2 md:grid-cols-2 md:gap-3">
        {groups.map((g) => (
          <section key={g.topic} className="min-w-0 rounded-xl border border-line bg-surface px-4 pt-3 pb-1.5 md:rounded-[14px] md:px-[18px] md:pt-3.5">
            <GroupHeader topic={g.topic} count={g.count} />
            {g.rows.length === 0 ? (
              <p className="border-t border-line py-2.5 text-[13px] text-faint">
                {g.count === 0 ? "Nothing today." : "Top story is in Must know."}
              </p>
            ) : (
              <div className="scroll-thin -mr-2.5 pr-2.5 lg:max-h-[292px] lg:overflow-y-auto">
                {g.rows.map((s) => (
                  <StoryRow key={s.id} story={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

/** The Briefing tab: topic filter chips, then each topic with its must-know card(s) and every story. */
export function BriefingBrowser({ groups }: { groups: TopicGroup[] }) {
  const [filter, setFilter] = useState<BriefingTopic | "all">("all");
  const [open, toggle] = useOpenSet();
  const total = groups.reduce((n, g) => n + g.count, 0);
  const shown = groups.filter((g) => (filter === "all" ? g.count > 0 : g.topic === filter));

  return (
    <>
      <div role="tablist" aria-label="Topics" className="scroll-thin -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
        <FilterChip selected={filter === "all"} onClick={() => setFilter("all")} label="All" count={total} />
        {groups.map((g) => (
          <FilterChip
            key={g.topic}
            selected={filter === g.topic}
            onClick={() => setFilter(g.topic)}
            label={TOPIC_META[g.topic].label}
            count={g.count}
            topic={g.topic}
          />
        ))}
      </div>

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        {shown.map((g) => (
          <section key={g.topic} className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="px-4 pt-3">
              <GroupHeader topic={g.topic} count={g.count} />
            </div>
            {g.mustKnow.length > 0 && (
              <div className="flex flex-col gap-2 px-2.5 pb-2.5">
                {g.mustKnow.map((s) => (
                  <MustKnowCard key={s.id} story={s} compact />
                ))}
              </div>
            )}
            <div className="px-4 pb-1.5">
              {g.rows.map((s) => (
                <StoryRow key={s.id} story={s} open={open.has(s.id)} onToggle={() => toggle(s.id)} />
              ))}
              {g.count === 0 && <p className="border-t border-line py-2.5 text-[13px] text-faint">Nothing today.</p>}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function FilterChip({
  selected,
  onClick,
  label,
  count,
  topic,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  count: number;
  topic?: BriefingTopic;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={
        "flex h-9 shrink-0 items-center gap-2 rounded-[9px] border pr-3 text-[13.5px] font-medium whitespace-nowrap " +
        (topic ? "pl-1.5 " : "pl-3 ") +
        (selected ? "border-[#55524B] bg-raised text-fg" : "border-line text-dim hover:text-fg")
      }
    >
      {topic && <TopicBadge topic={topic} />}
      {label}
      <span className="font-mono text-[11.5px] opacity-70">{count}</span>
    </button>
  );
}
