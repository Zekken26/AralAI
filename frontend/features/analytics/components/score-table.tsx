"use client";

import { useState, type ReactNode } from "react";

import { StatusBadge } from "@/features/analytics/components/status-badge";
import { displayPercent } from "@/features/analytics/utils/format";
import type { MasteryStatus } from "@/features/progress/schemas";

type ScoreRow = { mastery_score: number; status: MasteryStatus };

/**
 * Sortable mastery table. Rows come from a single already-fetched page;
 * sorting and the search filter are client-side only.
 */
export function ScoreTable<T extends ScoreRow>({
  rows,
  caption,
  nameRenderer,
  actionRenderer,
  emptyMessage,
}: {
  rows: T[];
  caption: string;
  nameRenderer: (row: T) => ReactNode;
  actionRenderer?: (row: T) => ReactNode;
  emptyMessage: string;
}) {
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = [...rows].sort((a, b) => {
    const result = a.mastery_score - b.mastery_score;
    return direction === "asc" ? result : -result;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left text-xs font-medium text-slate-500">
          {caption}
        </caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Name
            </th>
            <th
              scope="col"
              aria-sort={direction === "asc" ? "ascending" : "descending"}
              className="px-4 py-3 font-medium"
            >
              <button
                type="button"
                onClick={() => setDirection((current) => (current === "asc" ? "desc" : "asc"))}
                className="inline-flex items-center gap-1 uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                aria-label={`Sort by mastery score, currently ${direction}ending`}
              >
                Mastery score
                <span aria-hidden="true" className="text-teal-700">
                  {direction === "asc" ? "▲" : "▼"}
                </span>
              </button>
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            {actionRenderer ? (
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={actionRenderer ? 4 : 3} className="px-4 py-8 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{nameRenderer(row)}</td>
                <td className="px-4 py-3 text-slate-900">{displayPercent(row.mastery_score)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                {actionRenderer ? <td className="px-4 py-3">{actionRenderer(row)}</td> : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
