"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import { useTeacherLessons } from "@/features/lessons/hooks/use-teacher-lessons";
import { useTeacherQuizzes } from "@/features/quizzes/hooks/use-teacher-quizzes";
import {
  useClassroomAnalytics,
  useClassroomSupport,
} from "@/features/analytics/hooks/use-teacher-analytics";
import { useClassroomQuizResults } from "@/features/quizzes/hooks/use-teacher-quizzes";
import { displayPercent } from "@/features/analytics/utils/format";

export function TeacherDashboard() {
  const { user } = useAuth();
  const classroomsQuery = useTeacherClassrooms();
  const lessonsQuery = useTeacherLessons();
  const quizzesQuery = useTeacherQuizzes();

  const firstName = user?.first_name || user?.email || "there";
  const classrooms = classroomsQuery.data?.results ?? [];
  const lessons = lessonsQuery.data?.results ?? [];
  const quizzes = quizzesQuery.data?.results ?? [];
  const classroomNames = new Map(classrooms.map((classroom) => [classroom.id, classroom.name]));

  const loading = classroomsQuery.isPending || lessonsQuery.isPending || quizzesQuery.isPending;
  const failed =
    classroomsQuery.isError || lessonsQuery.isError || quizzesQuery.isError;

  const statCards = [
    {
      label: "Classrooms",
      value: classrooms.length,
      href: ROUTES.teacher.classrooms,
      cta: "Manage classes",
    },
    {
      label: "Lessons",
      value: lessons.length,
      href: ROUTES.teacher.lessons,
      cta: "Manage lessons",
    },
    {
      label: "Quizzes",
      value: quizzes.length,
      href: ROUTES.teacher.quizzes,
      cta: "Manage quizzes",
    },
  ];

  const recentLessons = lessons.slice(0, 3);
  const recentQuizzes = quizzes.slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hi, {firstName}!</h1>
          <p className="mt-1 text-sm text-slate-600">
            Teacher account &mdash; manage classrooms, lessons, and assessments.
          </p>
          <span className="mt-2 inline-block rounded bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
            Teacher
          </span>
        </div>
        <Link href={ROUTES.teacher.classroomCreate}>
          <Button>Create a classroom</Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : failed ? (
        <ErrorAlert>
          <p>We could not load your dashboard data right now.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              classroomsQuery.refetch();
              lessonsQuery.refetch();
              quizzesQuery.refetch();
            }}
            className="mt-1"
          >
            Retry
          </Button>
        </ErrorAlert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {statCards.map((card) => (
              <Card key={card.label} className="flex flex-col gap-1">
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <Link
                  href={card.href}
                  className="mt-2 inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {card.cta}
                </Link>
              </Card>
            ))}
          </div>

          {classrooms.length > 0 ? (
            <section aria-labelledby="dashboard-analytics-heading" className="flex flex-col gap-3">
              <div>
                <h2 id="dashboard-analytics-heading" className="text-lg font-semibold text-slate-900">
                  Analytics at a glance
                </h2>
                <p className="text-sm text-slate-600">
                  Class mastery and support signals for your classrooms.
                </p>
              </div>
              <ul className="grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
                {classrooms.slice(0, 3).map((classroom) => (
                  <li key={classroom.id}>
                    <ClassroomAnalyticsPreview classroomId={classroom.id} name={classroom.name} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {classrooms.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-800">Create your first classroom</p>
              <p className="max-w-md text-sm text-slate-600">
                Classrooms give you a join code to share with students, a home for your lessons,
                and a place to track quiz performance.
              </p>
              <Link href={ROUTES.teacher.classroomCreate} className="mt-2">
                <Button>Create a classroom</Button>
              </Link>
            </div>
          ) : (
            <>
              {recentLessons.length > 0 ? (
                <section aria-labelledby="dashboard-lessons-heading" className="flex flex-col gap-3">
                  <h2 id="dashboard-lessons-heading" className="text-lg font-semibold text-slate-900">
                    Recent lessons
                  </h2>
                  <ul className="flex list-none flex-col gap-3 p-0">
                    {recentLessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Card className="flex flex-col gap-1">
                          <Link
                            href={ROUTES.teacher.lessonDetail(lesson.id)}
                            className="w-fit text-base font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            {lesson.title}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {classroomNames.get(lesson.classroom) ?? `Classroom #${lesson.classroom}`}
                            {lesson.published_at ? ` · Published ${formatDate(lesson.published_at)}` : ""}
                          </p>
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {recentQuizzes.length > 0 ? (
                <section aria-labelledby="dashboard-quizzes-heading" className="flex flex-col gap-3">
                  <h2 id="dashboard-quizzes-heading" className="text-lg font-semibold text-slate-900">
                    Recent quizzes
                  </h2>
                  <ul className="flex list-none flex-col gap-3 p-0">
                    {recentQuizzes.map((quiz) => (
                      <li key={quiz.id}>
                        <Card className="flex flex-col gap-1">
                          <Link
                            href={ROUTES.teacher.quizDetail(quiz.id)}
                            className="w-fit text-base font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                          >
                            {quiz.title}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {classroomNames.get(quiz.classroom) ?? `Classroom #${quiz.classroom}`}
                            {" · "}
                            {quiz.question_count} question{quiz.question_count === 1 ? "" : "s"}
                            {quiz.published_at ? ` · Published ${formatDate(quiz.published_at)}` : ""}
                          </p>
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

function ClassroomAnalyticsPreview({ classroomId, name }: { classroomId: number; name: string }) {
  const progressQuery = useClassroomAnalytics(classroomId);
  const supportQuery = useClassroomSupport(classroomId);
  const quizResultsQuery = useClassroomQuizResults(classroomId);

  return (
    <Card className="flex flex-col gap-1">
      <Link
        href={ROUTES.teacher.classroomAnalytics(classroomId)}
        className="w-fit text-base font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        {name}
      </Link>
      {progressQuery.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : progressQuery.isError ? (
        <p className="text-sm text-slate-500">Analytics unavailable.</p>
      ) : (
        <>
          {progressQuery.data?.attempted_topics === 0 ? (
            <div className="mt-1 flex flex-col gap-2">
              <p className="text-sm text-slate-600">No assessments yet.</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href={ROUTES.teacher.lessonCreate}
                  className="rounded font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  Create a lesson
                </Link>
                <Link
                  href={ROUTES.teacher.quizCreate}
                  className="rounded font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  Create a quiz
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Average mastery:{" "}
              <span className="font-semibold text-slate-800">
                {displayPercent(progressQuery.data?.class_average_mastery)}
              </span>
              {progressQuery.data?.weakest_topics?.[0]
                ? ` · Weakest: ${progressQuery.data.weakest_topics[0].topic.title}`
                : ""}
            </p>
          )}
          {supportQuery.isError ? null : supportQuery.data && supportQuery.data.count > 0 ? (
            <p className="mt-1 inline-flex w-fit rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
              {supportQuery.data.count} student{supportQuery.data.count === 1 ? "" : "s"} needing
              support
            </p>
          ) : null}
          {quizResultsQuery.isError ? null : quizResultsQuery.data?.results?.length ? (
            <p className="text-xs text-slate-600">
              Latest quiz: {quizResultsQuery.data.results[0].title} ·{" "}
              {displayPercent(quizResultsQuery.data.results[0].average_score)}
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}