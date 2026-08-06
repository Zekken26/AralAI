import { masteryStatusLabel } from "@/features/analytics/utils/format";
import type { MasteryStatus } from "@/features/progress/schemas";

const STATUS_CLASSES: Record<MasteryStatus, string> = {
  NEEDS_SUPPORT: "bg-red-100 text-red-800",
  DEVELOPING: "bg-amber-100 text-amber-800",
  PROFICIENT: "bg-sky-100 text-sky-800",
  MASTERED: "bg-emerald-100 text-emerald-800",
};

/** Status badge that always includes the label text (never color-only). */
export function StatusBadge({ status }: { status: MasteryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {masteryStatusLabel(status)}
    </span>
  );
}