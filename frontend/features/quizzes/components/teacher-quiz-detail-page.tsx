"use client";

import { useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import {
  useArchiveTeacherQuiz,
  usePublishTeacherQuiz,
  useTeacherQuiz,
} from "@/features/quizzes/hooks/use-teacher-quizzes";
import { quizMutationErrorMessage } from "@/features/quizzes/utils/quiz-errors";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useTeacherLesson } from "@/features/lessons/hooks/use-teacher-lessons";

function formatDateValue(value: string | null): string {
  return value ? formatDate(value) : "—";
}

export function TeacherQuizDetailPage({ quizId }: { quizId: number }) {
  const quizQuery = useTeacherQuiz(quizId);
  const lessonQuery = useTeacherLesson(quizQuery.data?.lesson);
  const classroomsQuery = useTeacherClassrooms();

  const publish = usePublishTeacherQuiz();
  const archive = useArchiveTeacherQuiz();
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: "publish" | "archive") => {
    setActionError(null);
    try {
      if (action === "publish") {
        await publish.mutateAsync(quizId);
      } else {
        await archive.mutateAsync(quizId);
      }
    } catch (error) {
      setActionError(quizMutationErrorMessage(error));
    }
  };

  if (quizQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (quizQuery.isError || !quizQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this quiz.</p>
        <Button variant="secondary" size="sm" onClick={() => quizQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const quiz = quizQuery.data;
  const actionPending = publish.isPending || archive.isPending;
  const classroomName =
    classroomsQuery.data?.results.find((classroom) => classroom.id === quiz.classroom)?.name ??
    `Classroom #${quiz.classroom}`;
  const lessonTitle = lessonQuery.data?.title ?? `Lesson #${quiz.lesson}`;
  const approvedCount = quiz.questions.filter((question) => question.review_status === "APPROVED")
    .length;
  const published = quiz.status === "PUBLISHED";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {classroomName} · {lessonTitle}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                published
                  ? "bg-emerald-100 text-emerald-800"
                  : quiz.status === "ARCHIVED"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-amber-100 text-amber-800"
              }`}
            >
              {quiz.status.toLowerCase()}
            </span>
            {quiz.published_at ? (
              <span className="text-xs text-slate-500">
                Published {formatDate(quiz.published_at)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quiz.status === "DRAFT" ? (
            <Link href={ROUTES.teacher.quizEdit(quiz.id)}>
              <Button variant="secondary" disabled={actionPending}>
                Edit settings
              </Button>
            </Link>
          ) : null}
          <Link href={ROUTES.teacher.quizQuestions(quiz.id)}>
            <Button variant="secondary" disabled={actionPending}>
              Manage questions
            </Button>
          </Link>
          <Link href={ROUTES.teacher.quizResults(quiz.id)}>
            <Button variant="secondary" disabled={actionPending}>
              View results
            </Button>
          </Link>
          {quiz.status === "DRAFT" ? (
            <Button loading={publish.isPending} disabled={actionPending} onClick={() => runAction("publish")}>
              Publish
            </Button>
          ) : null}
          {quiz.status === "PUBLISHED" ? (
            <Button variant="secondary" disabled={actionPending} onClick={() => runAction("archive")}>
              {archive.isPending ? "Archiving…" : "Archive"}
            </Button>
          ) : null}
        </div>
      </div>

      {actionError ? <ErrorAlert message={actionError} /> : null}

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Quiz summary</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Questions</dt>
            <dd className="font-medium text-slate-900">
              {quiz.questions.length} ({approvedCount} approved)
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Passing score</dt>
            <dd className="font-medium text-slate-900">{Number(quiz.passing_score)}%</dd>
          </div>
          <div>
            <dt className="text-slate-500">Attempts allowed</dt>
            <dd className="font-medium text-slate-900">{quiz.attempt_limit ?? "Unlimited"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Time limit</dt>
            <dd className="font-medium text-slate-900">
              {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "None"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Available from</dt>
            <dd className="font-medium text-slate-900">{formatDateValue(quiz.available_from)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Available until</dt>
            <dd className="font-medium text-slate-900">{formatDateValue(quiz.available_until)}</dd>
          </div>
        </dl>
      </div>

      {quiz.instructions ? (
        <section aria-labelledby="quiz-instructions-heading">
          <h2 id="quiz-instructions-heading" className="mb-1 text-base font-semibold text-slate-900">
            Instructions
          </h2>
          <p className="whitespace-pre-wrap text-slate-700">{quiz.instructions}</p>
        </section>
      ) : null}

      <p className="text-xs text-slate-500">
        Randomize questions: {quiz.randomize_questions ? "On" : "Off"} · Show results
        immediately: {quiz.show_results_immediately ? "On" : "Off"}
      </p>
    </div>
  );
}