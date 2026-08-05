"use client";

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import { useStudentLesson, useTopic } from "@/features/lessons/hooks/use-lessons";
import { LessonContent } from "@/features/lessons/components/lesson-content";
import { unavailableMessage } from "@/features/lessons/utils/errors";

export function LessonDetailPage({ lessonId }: { lessonId: number }) {
  const lessonQuery = useStudentLesson(lessonId);
  const lesson = lessonQuery.data;
  const topicQuery = useTopic(lesson?.topic);

  const backHref = lesson
    ? ROUTES.student.classroomDetail(lesson.classroom)
    : ROUTES.student.classrooms;

  if (lessonQuery.isPending) {
    return (
      <div className="flex max-w-3xl flex-col gap-3" aria-busy="true" aria-label="Loading lesson">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (lessonQuery.isError || !lesson) {
    return (
      <EmptyState
        title={unavailableMessage(lessonQuery.error)}
        description="It may have been unpublished, or you may not have access to it."
        action={
          <Link
            href={backHref}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Back to classroom
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        <span aria-hidden="true">←</span> Back to classroom
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {topicQuery.data ? (
            <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
              {topicQuery.data.title}
            </span>
          ) : null}
          {lesson.published_at ? (
            <span className="text-xs text-slate-500">Published {formatDate(lesson.published_at)}</span>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
        {lesson.summary ? <p className="text-slate-600">{lesson.summary}</p> : null}
      </header>

      <section aria-labelledby="objectives-heading" className="flex flex-col gap-2">
        <h2 id="objectives-heading" className="text-lg font-semibold text-slate-900">
          Learning objectives
        </h2>
        {lesson.learning_objectives.length > 0 ? (
          <ul className="list-disc space-y-1 pl-6 text-slate-800 marker:text-teal-700">
            {lesson.learning_objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No learning objectives were listed.</p>
        )}
      </section>

      <section aria-labelledby="content-heading" className="flex flex-col gap-2">
        <h2 id="content-heading" className="text-lg font-semibold text-slate-900">
          Lesson content
        </h2>
        <LessonContent content={lesson.content} />
      </section>
    </div>
  );
}