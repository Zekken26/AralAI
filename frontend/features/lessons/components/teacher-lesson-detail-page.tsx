"use client";

import { useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import { LessonContent } from "@/features/lessons/components/lesson-content";
import {
  useArchiveLesson,
  usePublishLesson,
  useTeacherLesson,
} from "@/features/lessons/hooks/use-teacher-lessons";
import { lessonMutationErrorMessage } from "@/features/lessons/utils/lesson-errors";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useCurriculumTopic } from "@/features/curriculum/hooks/use-curriculum";

export function TeacherLessonDetailPage({ lessonId }: { lessonId: number }) {
  const lessonQuery = useTeacherLesson(lessonId);
  const topicQuery = useCurriculumTopic(lessonQuery.data?.topic);
  const classroomsQuery = useTeacherClassrooms();

  const publish = usePublishLesson();
  const archive = useArchiveLesson();
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: "publish" | "archive") => {
    setActionError(null);
    try {
      if (action === "publish") {
        await publish.mutateAsync(lessonId);
      } else {
        await archive.mutateAsync(lessonId);
      }
    } catch (error) {
      setActionError(lessonMutationErrorMessage(error));
    }
  };

  if (lessonQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (lessonQuery.isError || !lessonQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this lesson.</p>
        <Button variant="secondary" size="sm" onClick={() => lessonQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const lesson = lessonQuery.data;
  const classroomName =
    classroomsQuery.data?.results.find((classroom) => classroom.id === lesson.classroom)?.name ??
    `Classroom #${lesson.classroom}`;
  const actionPending = publish.isPending || archive.isPending;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lesson.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {classroomName}
            {topicQuery.data ? ` · ${topicQuery.data.title}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                lesson.status === "PUBLISHED"
                  ? "bg-emerald-100 text-emerald-800"
                  : lesson.status === "ARCHIVED"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {lesson.status.toLowerCase()}
            </span>
            {lesson.published_at ? (
              <span className="text-xs text-slate-500">Published {formatDate(lesson.published_at)}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={ROUTES.teacher.lessonEdit(lesson.id)}>
            <Button variant="secondary" disabled={actionPending}>
              Edit
            </Button>
          </Link>
          {lesson.status === "DRAFT" ? (
            <Button loading={publish.isPending} disabled={actionPending} onClick={() => runAction("publish")}>
              Publish
            </Button>
          ) : null}
          {lesson.status === "PUBLISHED" ? (
            <Button variant="secondary" disabled={actionPending} onClick={() => runAction("archive")}>
              {archive.isPending ? "Archiving…" : "Archive"}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorAlert message={actionError} /> : null}

      {lesson.summary ? <p className="text-base text-slate-700">{lesson.summary}</p> : null}

      {lesson.learning_objectives.length > 0 ? (
        <section aria-labelledby="lesson-objectives-heading">
          <h2 id="lesson-objectives-heading" className="mb-2 text-base font-semibold text-slate-900">
            Learning objectives
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-800">
            {lesson.learning_objectives.map((objective, index) => (
              <li key={index}>{objective}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="lesson-content-heading">
        <h2 id="lesson-content-heading" className="mb-2 text-base font-semibold text-slate-900">
          Lesson
        </h2>
        <LessonContent content={lesson.content} />
      </section>
    </div>
  );
}