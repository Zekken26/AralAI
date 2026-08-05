import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import type { Classroom } from "@/types/classrooms";

export function ClassroomCard({ classroom }: { classroom: Classroom }) {
  const meta = [classroom.section, classroom.school_year].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{classroom.name}</h2>
        {!classroom.is_active ? (
          <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
            Closed
          </span>
        ) : null}
      </div>
      {meta ? <p className="text-sm text-slate-600">{meta}</p> : null}
      <Link
        href={ROUTES.student.classroomDetail(classroom.id)}
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        Open classroom
      </Link>
    </Card>
  );
}