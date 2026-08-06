"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useTeacherClassrooms } from "@/features/classrooms/hooks/use-teacher-classrooms";
import type { Classroom } from "@/types/classrooms";

function TeacherClassroomCard({ classroom }: { classroom: Classroom }) {
  const meta = [classroom.section, classroom.school_year].filter(Boolean).join(" · ");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">{classroom.name}</h2>
        {!classroom.is_active ? (
          <span className="shrink-0 rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold uppercase text-slate-600">
            Closed
          </span>
        ) : null}
      </div>
      {meta ? <p className="text-sm text-slate-600">{meta}</p> : null}
      {classroom.join_code ? (
        <p className="text-sm text-slate-600">
          Join code:{" "}
          <span className="font-mono text-base font-semibold tracking-wide text-slate-900">
            {classroom.join_code}
          </span>
        </p>
      ) : null}
      <Link
        href={ROUTES.teacher.classroomDetail(classroom.id)}
        className="mt-auto inline-flex w-fit items-center gap-1 rounded-lg text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
      >
        Manage classroom
      </Link>
    </Card>
  );
}

export function TeacherClassroomListPage() {
  const classroomsQuery = useTeacherClassrooms();
  const classrooms = classroomsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classrooms</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your classrooms, share join codes, and track student progress.
          </p>
        </div>
        <Link href={ROUTES.teacher.classroomCreate}>
          <Button>New classroom</Button>
        </Link>
      </div>

      {classroomsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : classroomsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load your classrooms right now.</p>
          <Button variant="secondary" size="sm" onClick={() => classroomsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : classrooms.length === 0 ? (
        <EmptyState
          title="You have not created any classrooms yet"
          description="Create a classroom to generate a join code you can share with students."
          action={
            <Link href={ROUTES.teacher.classroomCreate}>
              <Button>Create your first classroom</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <TeacherClassroomCard key={classroom.id} classroom={classroom} />
          ))}
        </div>
      )}
    </div>
  );
}