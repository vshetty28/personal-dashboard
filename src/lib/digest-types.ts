// Contract for the JSON `payload` the daily agent POSTs to /api/ingest.
// One row per day (Briefing.date) — the whole daily briefing in one payload.
// Keep in sync with SETUP.md's ingest section and the zod schema in
// src/app/api/ingest/route.ts.

export type BriefingNewsItem = {
  title: string;
  source: string;
  url: string;
  summary: string;
  whyItMatters: string;
};

export type MarketsItem = BriefingNewsItem & {
  /** Ticker symbol, or a short label for a private company (e.g. "SpaceX"). */
  ticker: string;
};

export type EmailAttentionItem = {
  sender: string;
  subject: string;
  whyItMatters: string;
  /** Free text — e.g. "Reply by Fri 9/5", "Due tomorrow". Omit if not time-sensitive. */
  deadline?: string;
  nextAction: string;
};

export const BRIEFING_TOPICS = [
  "aiLlm",
  "softwareEngineering",
  "spaceDefense",
  "markets",
  "healthFitness",
  "sports",
] as const;

export type BriefingTopic = (typeof BRIEFING_TOPICS)[number];

export type BriefingPayload = {
  topics: {
    aiLlm: BriefingNewsItem[];
    softwareEngineering: BriefingNewsItem[];
    spaceDefense: BriefingNewsItem[];
    markets: MarketsItem[];
    healthFitness: BriefingNewsItem[];
    sports: BriefingNewsItem[];
  };
  // Explicitly empty (not omitted) when there's nothing actionable — the agent
  // is instructed to say so rather than staying silent, so the UI shows a
  // "nothing needs attention" state rather than treating [] as "not generated".
  emailAttention: EmailAttentionItem[];
};

export const TOPIC_LABELS: Record<BriefingTopic, string> = {
  aiLlm: "AI & LLMs",
  softwareEngineering: "Software Engineering",
  spaceDefense: "Space & Defense",
  markets: "Markets",
  healthFitness: "Health & Fitness",
  sports: "Sports",
};
