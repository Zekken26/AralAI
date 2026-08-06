"use client";

import { useState } from "react";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { Select } from "@/components/ui/select";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useTeacherLessons } from "@/features/lessons/hooks/use-teacher-lessons";
import type { Lesson } from "@/types/lessons";

const STATUS_LABELS: Record<string, string> = {
  ALL: "All statuses",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export function TeacherLessonListPage() {
  const [classroomId, setClassroomId] = useState<number | undefined>();
  const [status, setStatus] = useState<string>("ALL");

  const classroomsQuery = useTeacherClassrooms();
  const lessonsQuery = useTeacherLessons({
    classroom: classroomId,
    status: status === "ALL" ? undefined : (status as Lesson["status"]),
  });

  const classrooms = classroomsQuery.data?.results ?? [];
  const lessons = lessonsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lessons</h1>
          <p className="mt-1 text-sm text-slate-600">
            Write lessons for your classrooms, then publish them for students to read.
          </p>
        </div>
        <Link href={ROUTES.teacher.lessonCreate}>
          <Button>New lesson</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Select
            label="Classroom"
            aria-label="Filter lessons by classroom"
            options={[
              { value: "", label: "All classrooms" },
              ...classrooms.map((classroom) => ({
                value: String(classroom.id),
                label: classroom.name,
              })),
            ]}
            value={classroomId == null ? "" : String(classroomId)}
            onChange={(event) =>
              setClassroomId(event.target.value ? Number(event.target.value) : undefined)
            }
          />
        </div>
        <div className="w-48">
          <Select
            label="Status"
            aria-label="Filter lessons by status"
            options={(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((value) => ({
              value,
              label: STATUS_LABELS[value],
            }))}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
      </div>

      {lessonsQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : lessonsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load your lessons right now.</p>
          <Button variant="secondary" size="sm" onClick={() => lessonsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : lessons.length === 0 ? (
        <EmptyState
          title="No lessons match this view"
          description="Create a lesson to share curriculum content with your students."
          action={
            <Link href={ROUTES.teacher.lessonCreate}>
              <Button>Create a lesson</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Card className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={ROUTES.teacher.lessonDetail(lesson.id)}
                    className="w-fit text-base font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {lesson.title}
                  </Link>
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
                </div>
                {lesson.summary ? <p className="line-clamp-1 text-sm text-slate-600">{lesson.summary}</p> : null}
                <p className="text-xs text-slate-500">
                  {classrooms.find((classroom) => classroom.id === lesson.classroom)?.name ??
                    `Classroom #${lesson.classroom}`}
                  {lesson.published_at ? ` · Published ${formatDate(lesson.published_at)}` : ""}
                  {lesson.updated_at ? ` · Updated ${formatDate(lesson.updated_at)}` : ""}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}