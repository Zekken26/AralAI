"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { displayPercent } from "@/features/analytics/utils/format";
import {
  ANALYTICS_ACCESS_ERROR,
  analyticsErrorMessage,
  NO_PROGRESS_DATA_YET,
} from "@/features/analytics/utils/errors";
import { useTeacherClassroom } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useTeacherClassroomStudents } from "@/features/classrooms/hooks/use-teacher-classrooms";
import {
  useClassroomAnalytics,
  useClassroomSupport,
} from "@/features/analytics/hooks/use-teacher-analytics";
import { useClassroomQuizResults } from "@/features/quizzes/hooks/use-teacher-quizzes";
import { MasteryDistribution } from "@/features/analytics/components/mastery-distribution";
import { StatCard } from "@/features/analytics/components/stat-card";
import { SupportSection } from "@/features/analytics/components/support-section";
import { TopicPerformanceTable } from "@/features/analytics/components/topic-performance-table";
import { distributionDescription } from "@/features/analytics/utils/format";
import type { ClassroomQuizResult } from "@/features/quizzes/schemas/teacher";

export function ClassroomAnalyticsOverview({ classroomId }: { classroomId: number }) {
  const classroomQuery = useTeacherClassroom(classroomId);
  const progressQuery = useClassroomAnalytics(classroomId);
  const supportQuery = useClassroomSupport(classroomId);
  const rosterQuery = useTeacherClassroomStudents(classroomId);
  const quizResultsQuery = useClassroomQuizResults(classroomId);

  if (classroomQuery.isPending || progressQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (classroomQuery.isError || !classroomQuery.data) {
    return (
      <ErrorAlert>
        <p>{ANALYTICS_ACCESS_ERROR}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            classroomQuery.refetch();
            progressQuery.refetch();
          }}
          className="mt-1"
        >
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  if (progressQuery.isError || !progressQuery.data) {
    return (
      <ErrorAlert>
        <p>{analyticsErrorMessage(progressQuery.error)}</p>
        <Button variant="secondary" size="sm" onClick={() => progressQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const classroom = classroomQuery.data;
  const progress = progressQuery.data;
  const support = supportQuery.data;
  const roster = rosterQuery.data;
  const quizResults = quizResultsQuery.data;

  const aggregate = progress.topic_distribution.reduce(
    (acc, row) => ({
      needs_support: acc.needs_support + row.needs_support,
      developing: acc.developing + row.developing,
      proficient: acc.proficient + row.proficient,
      mastered: acc.mastered + row.mastered,
    }),
    { needs_support: 0, developing: 0, proficient: 0, mastered: 0 },
  );
  const submittedAttempts = progress.topic_distribution.reduce(
    (sum, row) => sum + row.submitted_attempts,
    0,
  );
  const hasProgress = progress.attempted_topics > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{classroom.name}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {classroom.section ? `${classroom.section} · ` : ""}
            {classroom.school_year || "No school year set"} · Classroom analytics
          </p>
        </div>
        <Link href={ROUTES.teacher.classrooms}>
          <Button variant="ghost">&larr; Back to classrooms</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Average mastery"
          value={displayPercent(progress.class_average_mastery)}
        />
        <StatCard label="Topics attempted" value={progress.attempted_topics} />
        <StatCard
          label="Students needing support"
          value={
            supportQuery.isPending ? (
              <Skeleton className="h-7 w-12" />
            ) : supportQuery.isError ? (
              "—"
            ) : (
              support?.count ?? 0
            )
          }
        />
        <StatCard
          label="Submitted attempts"
          value={submittedAttempts}
          hint="On quizzes tied to lessons in this classroom"
        />
        <StatCard
          label="Students in class"
          value={
            rosterQuery.isPending ? (
              <Skeleton className="h-7 w-12" />
            ) : rosterQuery.isError ? (
              "—"
            ) : (
              roster?.count ?? 0
            )
          }
        />
      </div>

      {!hasProgress ? (
        <EmptyState
          title={NO_PROGRESS_DATA_YET}
          description="Once students submit quizzes on lessons in this classroom, class mastery and topic performance will appear here."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={ROUTES.teacher.lessonCreate}>
                <Button variant="secondary">Create a lesson</Button>
              </Link>
              <Link href={ROUTES.teacher.quizCreate}>
                <Button variant="secondary">Create a quiz</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <section aria-labelledby="overview-heading" className="flex flex-col gap-3">
            <h2 id="overview-heading" className="text-lg font-semibold text-slate-900">
              Topic mastery overview
            </h2>
            <Card>
              <p className="mb-3 text-sm text-slate-600">
                Across {progress.attempted_topics} topic
                {progress.attempted_topics === 1 ? "" : "s"} in this classroom.
              </p>
              <MasteryDistribution
                distribution={aggregate}
                ariaLabel={`${distributionDescription(aggregate)} across this classroom`}
              />
            </Card>
          </section>

          <section aria-labelledby="topic-performance-heading" className="flex flex-col gap-3">
            <h2 id="topic-performance-heading" className="text-lg font-semibold text-slate-900">
              Topic performance
            </h2>
            <TopicPerformanceTable classroomId={classroomId} rows={progress.topic_distribution} />
          </section>

          <section aria-labelledby="weak-strong-heading" className="flex flex-col gap-3">
            <h2 id="weak-strong-heading" className="text-lg font-semibold text-slate-900">
              Weakest and strongest topics
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Weakest topics
                </h3>
                <ul className="flex list-none flex-col gap-2 p-0">
                  {progress.weakest_topics.map((item) => (
                    <li key={item.topic.id} className="flex items-center justify-between gap-3">
                      <Link
                        href={ROUTES.teacher.topicAnalytics(classroomId, item.topic.id)}
                        className="rounded text-sm font-medium text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                      >
                        {item.topic.title}
                      </Link>
                      <span className="text-sm font-semibold text-red-700">
                        {displayPercent(item.average_mastery)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Strongest topics
                </h3>
                <ul className="flex list-none flex-col gap-2 p-0">
                  {progress.strongest_topics.map((item) => (
                    <li key={item.topic.id} className="flex items-center justify-between gap-3">
                      <Link
                        href={ROUTES.teacher.topicAnalytics(classroomId, item.topic.id)}
                        className="rounded text-sm font-medium text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                      >
                        {item.topic.title}
                      </Link>
                      <span className="text-sm font-semibold text-emerald-700">
                        {displayPercent(item.average_mastery)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="support-heading" className="flex flex-col gap-3">
        <h2 id="support-heading" className="text-lg font-semibold text-slate-900">
          Students needing support
        </h2>
        {supportQuery.isPending ? (
          <Skeleton className="h-32 w-full" aria-busy="true" />
        ) : supportQuery.isError ? (
          <ErrorAlert>
            <p>We could not load the students needing support.</p>
            <Button variant="secondary" size="sm" onClick={() => supportQuery.refetch()} className="mt-1">
              Retry
            </Button>
          </ErrorAlert>
        ) : (
          <SupportSection classroomId={classroomId} students={support?.students ?? []} />
        )}
      </section>

      <section aria-labelledby="quiz-performance-heading" className="flex flex-col gap-3">
        <h2 id="quiz-performance-heading" className="text-lg font-semibold text-slate-900">
          Quiz performance
        </h2>
        {quizResultsQuery.isPending ? (
          <Skeleton className="h-40 w-full" aria-busy="true" />
        ) : quizResultsQuery.isError ? (
          <ErrorAlert>
            <p>We could not load the quiz results for this classroom.</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => quizResultsQuery.refetch()}
              className="mt-1"
            >
              Retry
            </Button>
          </ErrorAlert>
        ) : (quizResults?.results ?? []).length === 0 ? (
          <EmptyState
            title="No quizzes in this classroom yet"
            description="Create and publish quizzes for this classroom to see per-quiz performance here."
          />
        ) : (
          <QuizResultsTable rows={quizResults?.results ?? []} />
        )}
      </section>
    </div>
  );
}

function QuizResultsTable({ rows }: { rows: ClassroomQuizResult[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-left text-xs font-medium text-slate-500">
          Quiz performance for this classroom.
        </caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Quiz</th>
            <th scope="col" className="px-4 py-3 font-medium">Total attempts</th>
            <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
            <th scope="col" className="px-4 py-3 font-medium">Passed</th>
            <th scope="col" className="px-4 py-3 font-medium">Average score</th>
            <th scope="col" className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.quiz} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
              <td className="px-4 py-3 text-slate-600">{row.total_attempts}</td>
              <td className="px-4 py-3 text-slate-600">{row.submitted_attempts}</td>
              <td className="px-4 py-3 text-slate-600">{row.passed_attempts}</td>
              <td className="px-4 py-3 text-slate-900">{displayPercent(row.average_score)}</td>
              <td className="px-4 py-3">
                <Link
                  href={ROUTES.teacher.quizResults(row.quiz)}
                  className="rounded text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  View results
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
