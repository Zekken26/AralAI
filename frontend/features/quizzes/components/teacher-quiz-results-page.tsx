"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import {
  useTeacherQuiz,
  useTeacherQuizAttempts,
  useTeacherQuizResultsSummary,
} from "@/features/quizzes/hooks/use-teacher-quizzes";
import type { AttemptAnalytics } from "@/features/quizzes/schemas/teacher";

function formatPercent(value: string | null): string {
  if (value == null) {
    return "—";
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return value;
  }
  return `${number.toFixed(1)}%`;
}

function attemptStatusLabel(status: AttemptAnalytics["status"]): string {
  switch (status) {
    case "SUBMITTED":
      return "Submitted";
    case "IN_PROGRESS":
      return "In progress";
    case "EXPIRED":
      return "Expired";
  }
}

export function TeacherQuizResultsPage({ quizId }: { quizId: number }) {
  const quizQuery = useTeacherQuiz(quizId);
  const summaryQuery = useTeacherQuizResultsSummary(quizId);
  const attemptsQuery = useTeacherQuizAttempts(quizId);

  if (quizQuery.isPending || summaryQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (quizQuery.isError || !quizQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this quiz.</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            quizQuery.refetch();
            summaryQuery.refetch();
            attemptsQuery.refetch();
          }}
          className="mt-1"
        >
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const quiz = quizQuery.data;
  const summary = summaryQuery.data;
  const attempts = attemptsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results — {quiz.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Student attempts and per-question performance.
          </p>
        </div>
        <Link href={ROUTES.teacher.quizDetail(quizId)}>
          <Button variant="ghost">&larr; Back to quiz</Button>
        </Link>
      </div>

      {summaryQuery.isError ? (
        <ErrorAlert>
          <p>We could not load the results summary.</p>
          <Button variant="secondary" size="sm" onClick={() => summaryQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : summary && summary.submitted_attempts === 0 ? (
        <EmptyState
          title="No submitted attempts yet"
          description="Once students submit attempts for this quiz, the summary and attempt list will appear here."
        />
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Total attempts</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total_attempts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Submitted</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.submitted_attempts}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Average score</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatPercent(summary.average_score)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Pass rate</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatPercent(summary.pass_rate)}
            </p>
          </div>
        </div>
      ) : null}

      {summary && summary.students.length > 0 ? (
        <section aria-labelledby="students-overview-heading">
          <h2 id="students-overview-heading" className="mb-2 text-base font-semibold text-slate-900">
            Students
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Student</th>
                  <th scope="col" className="px-4 py-3 font-medium">Attempts</th>
                  <th scope="col" className="px-4 py-3 font-medium">Best score</th>
                  <th scope="col" className="px-4 py-3 font-medium">Passed</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.students.map((row) => (
                  <tr key={row.student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {`${row.student.first_name} ${row.student.last_name}`.trim() ||
                        `Student #${row.student.id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.attempts}</td>
                    <td className="px-4 py-3 text-slate-900">{formatPercent(row.best_score)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.passed_attempts}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.last_submitted_at ? formatDate(row.last_submitted_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="attempts-heading">
        <h2 id="attempts-heading" className="mb-2 text-base font-semibold text-slate-900">
          Attempts
        </h2>
        {attemptsQuery.isPending ? (
          <Skeleton className="h-40 w-full" aria-busy="true" />
        ) : attemptsQuery.isError ? (
          <ErrorAlert>
            <p>We could not load the attempts for this quiz.</p>
            <Button variant="secondary" size="sm" onClick={() => attemptsQuery.refetch()} className="mt-1">
              Retry
            </Button>
          </ErrorAlert>
        ) : attempts.length === 0 ? (
          <EmptyState title="No attempts yet" description="Attempts will appear once students take this quiz." />
        ) : (
          <div className="flex flex-col gap-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {`${attempt.student.first_name} ${attempt.student.last_name}`.trim() ||
                      `Student #${attempt.student.id}`}
                    <span className="ml-2 text-xs font-medium text-slate-500">
                      Attempt #{attempt.attempt_number}
                    </span>
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                      attempt.status === "SUBMITTED"
                        ? attempt.passed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {attemptStatusLabel(attempt.status)}
                    {attempt.status === "SUBMITTED" && attempt.passed ? " · Passed" : ""}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Score: {formatPercent(attempt.score)} · Earned {attempt.earned_points ?? "—"}/
                  {attempt.maximum_points ?? "—"} points
                  {attempt.submitted_at ? ` · ${formatDate(attempt.submitted_at)}` : ""}
                </p>
                {attempt.status === "SUBMITTED" && attempt.answers.length > 0 ? (
                  <ul className="mt-2 flex list-none flex-col gap-1 border-t border-slate-100 pt-2 p-0">
                    {attempt.answers.map((answer) => (
                      <li key={answer.question} className="flex items-start justify-between gap-3 text-sm">
                        <span className="line-clamp-2 text-slate-700">{answer.prompt}</span>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            answer.is_correct ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {answer.is_correct ? "Correct" : "Incorrect"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}