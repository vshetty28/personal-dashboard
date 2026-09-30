// Contract for what the automations POST to /api/ingest.
//
// Two kinds of post:
//   kind "briefing" (default): one per day, the daily briefing + email attention.
//   kind "weekend": one per weekend, promotions + curated readings.
//
// The zod schemas are the source of truth; the types below are inferred from
// them. Keep SETUP.md's ingest section in sync when changing anything here.

import { z } from "zod";

export const BRIEFING_TOPICS = [
  "aiLlm",
  "softwareEngineering",
  "spaceDefense",
  "markets",
  "healthFitness",
  "sports",
] as const;

export type BriefingTopic = (typeof BRIEFING_TOPICS)[number];

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** 1 = must know (aim for at most 3 per day), 2 = normal, 3 = low. Defaults to 2. */
const priority = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const newsItemSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string(),
  /** 1-2 sentence summary. Shown as a one-liner under each story, expanded on click. */
  summary: z.string(),
  whyItMatters: z.string(),
  /** Takeaway in 12 words or fewer. This is what you scan; falls back to `title`. */
  tldr: z.string().optional(),
  priority: priority.optional(),
  /** Markets only: price move as a signed string, e.g. "+2.1%", "-0.6%". Anything else renders neutral. */
  move: z.string().optional(),
});

export const marketsItemSchema = newsItemSchema.extend({
  /** Ticker symbol, or a short label for a private company (e.g. "SpaceX"). */
  ticker: z.string(),
});

export const emailAttentionItemSchema = z.object({
  sender: z.string(),
  subject: z.string(),
  /** What the email says / why it needs you. Shown in full on the card. */
  whyItMatters: z.string(),
  /** The call to action. */
  nextAction: z.string(),
  /** Optional longer summary; shown instead of whyItMatters when present. */
  summary: z.string().optional(),
  /** Due date (YYYY-MM-DD). Drives the countdown and the orange "act" cue. */
  dueAt: dateString.optional(),
  /** Free-text deadline, used only when there's no dueAt (e.g. "End of week"). */
  deadline: z.string().optional(),
  /** Short category label, e.g. "Career", "School", "Housing". */
  category: z.string().optional(),
});

export const HEADLINE_TONES = ["action", "weekend", ...BRIEFING_TOPICS] as const;

export const headlineSegmentSchema = z.object({
  text: z.string(),
  /** Colors the segment: "action" = orange, "weekend" = gold, a topic key = that topic's color. */
  tone: z.enum(HEADLINE_TONES).optional(),
});

export const briefingPayloadSchema = z.object({
  /** The opening sentence, as colored segments. Optional; the page writes a plain fallback. */
  headline: z.array(headlineSegmentSchema).optional(),
  topics: z.object({
    aiLlm: z.array(newsItemSchema).default([]),
    softwareEngineering: z.array(newsItemSchema).default([]),
    spaceDefense: z.array(newsItemSchema).default([]),
    markets: z.array(marketsItemSchema).default([]),
    healthFitness: z.array(newsItemSchema).default([]),
    sports: z.array(newsItemSchema).default([]),
  }),
  // Explicitly empty (not omitted) when there's nothing actionable.
  emailAttention: z.array(emailAttentionItemSchema),
});

export const promotionSchema = z.object({
  merchant: z.string(),
  /** The headline number, kept short: "20% off", "$10 off", "Free". */
  offer: z.string(),
  detail: z.string().optional(),
  code: z.string().optional(),
  url: z.string().optional(),
  /** Last day the deal is valid (YYYY-MM-DD). Expired deals are hidden. */
  expiresAt: dateString.optional(),
});

export const READING_TYPES = ["paper", "preprint", "report", "analysis", "industry"] as const;

export const readingSchema = z.object({
  title: z.string(),
  source: z.string(),
  url: z.string(),
  minutes: z.number().int().positive().optional(),
  /** Why it was picked for you. */
  why: z.string(),
  /** paper = peer-reviewed, preprint, report = industry/technical report, analysis, industry = industry development. */
  type: z.enum(READING_TYPES).optional(),
});

/** Stored weekend briefing (both sections always present once read). */
export const weekendPayloadSchema = z.object({
  promotions: z.array(promotionSchema).default([]),
  readings: z.array(readingSchema).default([]),
});

/**
 * What a weekend post may contain. Deals and readings come from separate
 * automations, so each post carries only its own section; a section left out
 * is kept as it was, a section sent (even []) replaces what was there.
 */
export const weekendIngestSchema = z
  .object({
    promotions: z.array(promotionSchema).optional(),
    readings: z.array(readingSchema).optional(),
  })
  .refine((p) => p.promotions !== undefined || p.readings !== undefined, {
    message: "send promotions, readings, or both",
  });

export type BriefingNewsItem = z.infer<typeof newsItemSchema>;
export type MarketsItem = z.infer<typeof marketsItemSchema>;
export type EmailAttentionItem = z.infer<typeof emailAttentionItemSchema>;
export type HeadlineSegment = z.infer<typeof headlineSegmentSchema>;
export type HeadlineTone = (typeof HEADLINE_TONES)[number];
export type BriefingPayload = z.infer<typeof briefingPayloadSchema>;
export type Promotion = z.infer<typeof promotionSchema>;
export type Reading = z.infer<typeof readingSchema>;
export type WeekendPayload = z.infer<typeof weekendPayloadSchema>;

export const TOPIC_LABELS: Record<BriefingTopic, string> = {
  aiLlm: "AI & LLMs",
  softwareEngineering: "Engineering",
  spaceDefense: "Space & Defense",
  markets: "Markets",
  healthFitness: "Health & Fitness",
  sports: "Sports",
};
