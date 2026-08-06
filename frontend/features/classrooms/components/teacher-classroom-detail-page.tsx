"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import { useTeacherClassroom } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useClassroomQuizResults } from "@/features/quizzes/hooks/use-teacher-quizzes";

function formatScore(value: string | null): string {
  if (value == null) {
    return "—";
  }
  const number = Number(value);
  if (Number.isNaN(number)) {
    return value;
  }
  return `${number.toFixed(2)}%`;
}

export function TeacherClassroomDetailPage({ classroomId }: { classroomId: number }) {
  const classroomQuery = useTeacherClassroom(classroomId);
  const resultsQuery = useClassroomQuizResults(classroomId);

  if (classroomQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (classroomQuery.isError || !classroomQuery.data) {
    return (
      <ErrorAlert>
        <p>We could not load this classroom.</p>
        <Button variant="secondary" size="sm" onClick={() => classroomQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const classroom = classroomQuery.data;
  const meta = [classroom.section, classroom.school_year].filter(Boolean).join(" · ");
  const quizResults = resultsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{classroom.name}</h1>
          {meta ? <p className="mt-1 text-sm text-slate-600">{meta}</p> : null}
          <p className="mt-1 text-xs text-slate-500">
            Created {formatDate(classroom.created_at)}
            {!classroom.is_active ? " · Closed" : ""}
          </p>
        </div>
        <Link href={ROUTES.teacher.classroomStudents(classroom.id)}>
          <Button variant="secondary">View students</Button>
        </Link>
      </div>

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-slate-900">Join code</h2>
        {classroom.join_code ? (
          <>
            <p className="font-mono text-3xl font-bold tracking-[0.2em] text-teal-700">
              {classroom.join_code}
            </p>
            <p className="text-sm text-slate-600">
              Share this code with students so they can join this classroom.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            This classroom&apos;s join code is only shown to its owner.
          </p>
        )}
      </Card>

      <section aria-labelledby="classroom-quiz-results-heading" className="flex flex-col gap-3">
        <h2 id="classroom-quiz-results-heading" className="text-lg font-semibold text-slate-900">
          Quiz performance
        </h2>
        {resultsQuery.isPending ? (
          <Skeleton className="h-24 w-full" aria-busy="true" />
        ) : resultsQuery.isError ? (
          <ErrorAlert role="status">
            <p>We could not load quiz performance right now.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => resultsQuery.refetch()}
              className="mt-1"
            >
              Retry
            </Button>
          </ErrorAlert>
        ) : quizResults.length === 0 ? (
          <EmptyState
            title="No quiz activity yet"
            description="Once students take quizzes in this classroom, results will appear here."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Quiz</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Attempts</th>
                  <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                  <th scope="col" className="px-4 py-3 font-medium">Passed</th>
                  <th scope="col" className="px-4 py-3 font-medium">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizResults.map((result) => (
                  <tr key={result.quiz} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{result.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                          result.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : result.status === "ARCHIVED"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {result.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{result.total_attempts}</td>
                    <td className="px-4 py-3 text-slate-600">{result.submitted_attempts}</td>
                    <td className="px-4 py-3 text-slate-600">{result.passed_attempts}</td>
                    <td className="px-4 py-3 text-slate-900">{formatScore(result.average_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}