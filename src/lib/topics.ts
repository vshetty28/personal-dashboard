import { BRIEFING_TOPICS, TOPIC_LABELS, type BriefingTopic } from "@/lib/digest-types";

/**
 * Fixed visual identity per topic. These never change day to day, so the
 * badge + color become a cue you read without thinking.
 */
export const TOPIC_META: Record<BriefingTopic, { label: string; code: string; hue: string; tint: string }> = {
  aiLlm: { label: TOPIC_LABELS.aiLlm, code: "AI", hue: "#B69CFF", tint: "#1D1929" },
  softwareEngineering: { label: TOPIC_LABELS.softwareEngineering, code: "SE", hue: "#4FD1C5", tint: "#122324" },
  spaceDefense: { label: TOPIC_LABELS.spaceDefense, code: "SD", hue: "#7EA8FF", tint: "#151C2E" },
  markets: { label: TOPIC_LABELS.markets, code: "MK", hue: "#6FD08C", tint: "#142219" },
  healthFitness: { label: TOPIC_LABELS.healthFitness, code: "HF", hue: "#F38FB9", tint: "#271720" },
  sports: { label: TOPIC_LABELS.sports, code: "SP", hue: "#A7B0C8", tint: "#1B1D23" },
};

export { BRIEFING_TOPICS };

export const ACT = "#FF7B5C";
export const GOLD = "#F4C152";

/** Markets move -> arrow + color. "+2.1%" is up, "-0.6%" is down, anything else is neutral. */
export function describeMove(move: string | undefined): { text: string; color: string } | null {
  if (!move) return null;
  const trimmed = move.trim();
  if (/^\+/.test(trimmed)) return { text: `▲ ${trimmed.slice(1)}`, color: "#6FD08C" };
  if (/^[-−]/.test(trimmed)) return { text: `▼ ${trimmed.slice(1)}`, color: "#F08A8A" };
  return { text: trimmed.toUpperCase(), color: "#8E8B82" };
}
