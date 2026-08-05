"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useStudentClassrooms } from "@/features/classrooms/hooks/use-classrooms";
import { ClassroomCard } from "@/features/classrooms/components/classroom-card";
import { JoinClassroomDialog } from "@/features/classrooms/components/join-classroom-dialog";
import { useStudentLessons } from "@/features/lessons/hooks/use-lessons";

export function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const classroomsQuery = useStudentClassrooms();
  const recentLessonsQuery = useStudentLessons({ enabled: true });
  const [joinOpen, setJoinOpen] = useState(false);

  const firstName = user?.first_name || user?.email || "there";
  const classrooms = classroomsQuery.data?.results ?? [];
  const recentLessons = (recentLessonsQuery.data?.results ?? []).slice(0, 3);
  const classroomNames = new Map(classrooms.map((classroom) => [classroom.id, classroom.name]));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hi, {firstName}!</h1>
          <p className="mt-1 text-sm text-slate-600">
            Student account &mdash; join classrooms, read lessons, and practice.
          </p>
        </div>
        <Button onClick={() => setJoinOpen(true)}>Join a classroom</Button>
      </div>

      {classroomsQuery.isPending ? (
        <section aria-label="Your classrooms" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Your classrooms</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      ) : classroomsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load your classrooms right now.</p>
          <Button variant="secondary" size="sm" onClick={() => classroomsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : (
        <section aria-labelledby="dashboard-classrooms-heading" className="flex flex-col gap-3">
          <h2 id="dashboard-classrooms-heading" className="text-lg font-semibold text-slate-900">
            Your classrooms
          </h2>
          {classrooms.length === 0 ? (
            <EmptyState
              title="You have not joined any classrooms yet"
              description="Join with a code from your teacher to see lessons and quizzes here."
              action={<Button onClick={() => setJoinOpen(true)}>Join a classroom</Button>}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {classrooms.slice(0, 3).map((classroom) => (
                  <ClassroomCard key={classroom.id} classroom={classroom} />
                ))}
              </div>
              {classrooms.length > 3 ? (
                <Link
                  href={ROUTES.student.classrooms}
                  className="w-fit rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  View all classrooms
                </Link>
              ) : null}
            </>
          )}
        </section>
      )}

      {recentLessonsQuery.isPending ? (
        <section aria-label="Recent lessons" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Recently published lessons</h2>
          <div className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </section>
      ) : recentLessonsQuery.isError ? null : recentLessons.length > 0 ? (
        <section aria-labelledby="dashboard-lessons-heading" className="flex flex-col gap-3">
          <h2 id="dashboard-lessons-heading" className="text-lg font-semibold text-slate-900">
            Recently published lessons
          </h2>
          <ul className="flex list-none flex-col gap-3 p-0">
            {recentLessons.map((lesson) => (
              <li key={lesson.id}>
                <Card className="flex flex-col gap-1">
                  <Link
                    href={ROUTES.student.lessonDetail(lesson.id)}
                    className="w-fit text-base font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    {lesson.title}
                  </Link>
                  {lesson.summary ? (
                    <p className="line-clamp-1 text-sm text-slate-600">{lesson.summary}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {classroomNames.get(lesson.classroom) ?? `Classroom #${lesson.classroom}`}
                    {lesson.published_at ? ` · ${formatDate(lesson.published_at)}` : ""}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <JoinClassroomDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(classroomId) => router.push(ROUTES.student.classroomDetail(classroomId))}
      />
    </div>
  );
}