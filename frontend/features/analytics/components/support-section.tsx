"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { displayPercent } from "@/features/analytics/utils/format";
import type { StudentSupportItem } from "@/features/analytics/types";

function studentName(student: StudentSupportItem["student"]): string {
  return `${student.first_name} ${student.last_name}`.trim() || `Student #${student.id}`;
}

/**
 * Students needing support. The backend guarantees `topics` are sorted by
 * ascending mastery score, so the first topic is the weakest one.
 */
export function SupportSection({
  classroomId,
  students,
}: {
  classroomId: number;
  students: StudentSupportItem[];
}) {
  if (students.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
        No students currently meet the support criteria.
      </p>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {students.map((item) => (
        <li key={item.student.id}>
          <Card className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base font-semibold text-slate-900">
                {studentName(item.student)}
                <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                  {item.topics.length} weak topic{item.topics.length === 1 ? "" : "s"}
                </span>
              </p>
              <Link
                href={ROUTES.teacher.studentAnalytics(classroomId, item.student.id)}
                className="rounded text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                View progress
              </Link>
            </div>
            <p className="text-xs text-slate-500">
              Lowest mastery: {displayPercent(item.topics[0]?.mastery_score)} · Weak topics:{" "}
              {item.topics.map((topic) => topic.topic.title).join(", ")}
            </p>
          </Card>
        </li>
      ))}
    </ul>
  );
}