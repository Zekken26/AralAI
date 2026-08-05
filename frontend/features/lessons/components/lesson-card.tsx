import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import type { Lesson } from "@/types/lessons";

export function LessonCard({
  lesson,
  topicName,
}: {
  lesson: Lesson;
  topicName?: string;
}) {
  const published = lesson.published_at ? formatDate(lesson.published_at) : "";

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{lesson.title}</h3>
        {topicName ? (
          <span className="shrink-0 rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
            {topicName}
          </span>
        ) : null}
      </div>
      {lesson.summary ? (
        <p className="line-clamp-2 text-sm text-slate-600">{lesson.summary}</p>
      ) : null}
      {published ? (
        <p className="text-xs text-slate-500">Published {published}</p>
      ) : null}
      <Link
        href={ROUTES.student.lessonDetail(lesson.id)}
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        Open lesson
      </Link>
    </Card>
  );
}