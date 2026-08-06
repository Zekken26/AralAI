import type { MasteryDistribution } from "@/features/analytics/types";
import type { MasteryStatus } from "@/features/progress/schemas";

export const MASTERY_STATUS_ORDER: readonly MasteryStatus[] = [
  "NEEDS_SUPPORT",
  "DEVELOPING",
  "PROFICIENT",
  "MASTERED",
];

/** Display order rank: NEEDS_SUPPORT = 0 ... MASTERED = 3. */
export function masteryStatusRank(status: MasteryStatus): number {
  return MASTERY_STATUS_ORDER.indexOf(status);
}

export function masteryStatusLabel(status: MasteryStatus): string {
  switch (status) {
    case "NEEDS_SUPPORT":
      return "Needs support";
    case "DEVELOPING":
      return "Developing";
    case "PROFICIENT":
      return "Proficient";
    case "MASTERED":
      return "Mastered";
  }
}

/**
 * Render a mastery/score value as a percentage string.
 *
 * Accepts both transports: the progress endpoints return decimals as JSON
 * numbers, while quiz endpoints return them as strings. Invalid or null
 * values render as an em dash; unknown strings are passed through untouched
 * rather than shown as NaN.
 */
export function displayPercent(value: number | string | null | undefined): string {
  if (value == null) {
    return "—";
  }
  const number = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(number)) {
    return String(value);
  }
  return `${number.toFixed(1)}%`;
}

export function priorityLabel(priority: "HIGH" | "MEDIUM" | "LOW"): string {
  switch (priority) {
    case "HIGH":
      return "High priority";
    case "MEDIUM":
      return "Medium priority";
    case "LOW":
      return "Low priority";
  }
}

/**
 * Textual equivalent for a mastery status distribution, used as the
 * accessible description of the stacked distribution bar.
 */
export function distributionDescription(distribution: MasteryDistribution): string {
  const counts = [
    [distribution.mastered, "mastered"],
    [distribution.proficient, "proficient"],
    [distribution.developing, "developing"],
    [distribution.needs_support, "needing support"],
  ] as const;
  const parts = counts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`);
  if (parts.length === 0) {
    return "No students have attempted this yet.";
  }
  return parts.join(", ");
}

/**
 * Accessible trend-style description of a set of mastery scores (already
 * fetched data only; never a recalculated metric).
 */
export function describeScores(scores: readonly number[]): string {
  if (scores.length === 0) {
    return "No mastery scores are available yet.";
  }
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) {
    return `All ${scores.length} topic score${scores.length === 1 ? " is" : "s are"} ${displayPercent(max)}.`;
  }
  return `Scores range from ${displayPercent(min)} to ${displayPercent(max)} across ${scores.length} topic${scores.length === 1 ? "" : "s"}.`;
}
