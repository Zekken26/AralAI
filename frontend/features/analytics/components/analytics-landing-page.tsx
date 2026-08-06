"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";

export function AnalyticsLandingPage() {
  const classroomsQuery = useTeacherClassrooms();

  if (classroomsQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (classroomsQuery.isError) {
    return (
      <ErrorAlert>
        <p>We could not load your classrooms right now.</p>
        <Button variant="secondary" size="sm" onClick={() => classroomsQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const classrooms = classroomsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose a classroom to review class mastery, topic performance, and students needing
          support.
        </p>
      </div>

      {classrooms.length === 0 ? (
        <EmptyState
          title="No classrooms yet"
          description="Create a classroom and share its join code so students can start learning, then come back to track their mastery."
          action={
            <Link href={ROUTES.teacher.classroomCreate}>
              <Button>Create a classroom</Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {classrooms.map((classroom) => (
            <li key={classroom.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{classroom.name}</p>
                  <p className="text-xs text-slate-500">
                    {classroom.section ? `${classroom.section} · ` : ""}
                    {classroom.school_year || "No school year set"}
                  </p>
                </div>
                <Link
                  href={ROUTES.teacher.classroomAnalytics(classroom.id)}
                  className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  Open analytics
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}