"use client";

import { useState } from "react";

import Link from "next/link";

import { ROUTES } from "@/lib/routes";
import { displayPercent } from "@/features/analytics/utils/format";
import type { TopicDistributionItem } from "@/features/analytics/types";

type SortKey =
  | "topic"
  | "average_mastery"
  | "attempted_students"
  | "needs_support"
  | "developing"
  | "proficient"
  | "mastered";

type SortState = { key: SortKey; direction: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "topic", label: "Topic" },
  { key: "average_mastery", label: "Average mastery", numeric: true },
  { key: "attempted_students", label: "Students attempted", numeric: true },
  { key: "needs_support", label: "Needs support", numeric: true },
  { key: "developing", label: "Developing", numeric: true },
  { key: "proficient", label: "Proficient", numeric: true },
  { key: "mastered", label: "Mastered", numeric: true },
];

function compareRows(a: TopicDistributionItem, b: TopicDistributionItem, key: SortKey): number {
  if (key === "topic") {
    return a.topic.title.localeCompare(b.topic.title);
  }
  if (key === "average_mastery") {
    return a.average_mastery - b.average_mastery;
  }
  return a[key] - b[key];
}

/**
 * Topic-performance table. Mastery values are the backend's own
 * `average_mastery`; only presentation formatting is done here.
 */
export function TopicPerformanceTable({
  classroomId,
  rows,
}: {
  classroomId: number;
  rows: TopicDistributionItem[];
}) {
  const [sort, setSort] = useState<SortState>({ key: "topic", direction: "asc" });

  const sorted = [...rows].sort((a, b) => {
    const result = compareRows(a, b, sort.key);
    return sort.direction === "asc" ? result : -result;
  });

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "topic" ? "asc" : "desc" },
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left text-xs font-medium text-slate-500">
          Topic performance by average mastery and status distribution.
        </caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  sort.key === column.key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                className="px-4 py-3 font-medium"
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="inline-flex items-center gap-1 uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  aria-label={`Sort by ${column.label}${sort.key === column.key ? `, currently ${sort.direction}ending` : ""}`}
                >
                  {column.label}
                  <span aria-hidden="true" className={sort.key === column.key ? "text-teal-700" : "text-slate-300"}>
                    {sort.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </th>
            ))}
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row) => (
            <tr key={row.topic.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{row.topic.title}</p>
                <p className="text-xs text-slate-500">{row.topic.code}</p>
              </td>
              <td className="px-4 py-3 text-slate-900">{displayPercent(row.average_mastery)}</td>
              <td className="px-4 py-3 text-slate-600">{row.attempted_students}</td>
              <td className="px-4 py-3 text-slate-600">{row.needs_support}</td>
              <td className="px-4 py-3 text-slate-600">{row.developing}</td>
              <td className="px-4 py-3 text-slate-600">{row.proficient}</td>
              <td className="px-4 py-3 text-slate-600">{row.mastered}</td>
              <td className="px-4 py-3">
                <Link
                  href={ROUTES.teacher.topicAnalytics(classroomId, row.topic.id)}
                  className="rounded text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  View topic
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
