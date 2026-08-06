import type { MasteryDistribution } from "@/features/analytics/types";

const SEGMENTS = [
  { key: "needs_support", label: "Needs support", className: "bg-red-500" },
  { key: "developing", label: "Developing", className: "bg-amber-500" },
  { key: "proficient", label: "Proficient", className: "bg-sky-500" },
  { key: "mastered", label: "Mastered", className: "bg-emerald-500" },
] as const;

/**
 * Stacked mastery-status distribution. The bar exposes a textual
 * equivalent via role="img" + aria-label, and the legend always shows
 * counts alongside the color swatches.
 */
export function MasteryDistribution({
  distribution,
  ariaLabel,
}: {
  distribution: MasteryDistribution;
  ariaLabel: string;
}) {
  const total =
    distribution.needs_support +
    distribution.developing +
    distribution.proficient +
    distribution.mastered;

  if (total === 0) {
    return <p className="text-sm text-slate-500">No students have attempted this yet.</p>;
  }

  return (
    <div>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
      >
        {SEGMENTS.map((segment) => {
          const count = distribution[segment.key];
          if (count === 0) {
            return null;
          }
          return (
            <div
              key={segment.key}
              className={segment.className}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${segment.label}: ${count}`}
            />
          );
        })}
      </div>
      <ul className="mt-2 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${segment.className}`} aria-hidden="true" />
            <span>{segment.label}</span>
            <span className="font-semibold text-slate-800">{distribution[segment.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}