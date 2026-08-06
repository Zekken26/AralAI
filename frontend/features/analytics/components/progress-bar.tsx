/** Horizontal mastery bar with a visible value label (never color-only). */
export function ProgressBar({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value: number;
  valueLabel: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <span className="text-sm font-semibold text-slate-700">{valueLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}