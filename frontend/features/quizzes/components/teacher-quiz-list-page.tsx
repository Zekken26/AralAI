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
import { useTeacherQuizzes } from "@/features/quizzes/hooks/use-teacher-quizzes";
import type { TeacherQuiz } from "@/features/quizzes/schemas/teacher";

const STATUS_LABELS: Record<string, string> = {
  ALL: "All statuses",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

function formatScore(value: string): number {
  return Number.isNaN(Number(value)) ? 0 : Number(value);
}

export function TeacherQuizListPage() {
  const [classroomId, setClassroomId] = useState<number | undefined>();
  const [status, setStatus] = useState<string>("ALL");

  const classroomsQuery = useTeacherClassrooms();
  const quizzesQuery = useTeacherQuizzes({
    classroom: classroomId,
    status: status === "ALL" ? undefined : (status as TeacherQuiz["status"]),
  });

  const classrooms = classroomsQuery.data?.results ?? [];
  const quizzes = quizzesQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Build quizzes for published lessons and track student results.
          </p>
        </div>
        <Link href={ROUTES.teacher.quizCreate}>
          <Button>New quiz</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="w-64">
          <Select
            label="Classroom"
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
            options={(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((value) => ({
              value,
              label: STATUS_LABELS[value],
            }))}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
      </div>

      {quizzesQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : quizzesQuery.isError ? (
        <ErrorAlert>
          <p>We could not load your quizzes right now.</p>
          <Button variant="secondary" size="sm" onClick={() => quizzesQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : quizzes.length === 0 ? (
        <EmptyState
          title="No quizzes match this view"
          description="Create a quiz for a published lesson to assess your students."
          action={
            <Link href={ROUTES.teacher.quizCreate}>
              <Button>Create a quiz</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <Card className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={ROUTES.teacher.quizDetail(quiz.id)}
                    className="w-fit text-base font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {quiz.title}
                  </Link>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      quiz.status === "PUBLISHED"
                        ? "bg-emerald-100 text-emerald-800"
                        : quiz.status === "ARCHIVED"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {quiz.status.toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {classrooms.find((classroom) => classroom.id === quiz.classroom)?.name ??
                    `Classroom #${quiz.classroom}`}
                  {" · "}
                  {quiz.question_count} question{quiz.question_count === 1 ? "" : "s"}
                  {" · "}
                  Pass {formatScore(quiz.passing_score)}%
                  {quiz.published_at ? ` · Published ${formatDate(quiz.published_at)}` : ""}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}