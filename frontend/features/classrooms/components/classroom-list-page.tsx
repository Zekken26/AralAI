"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { useStudentClassrooms } from "@/features/classrooms/hooks/use-classrooms";
import { ClassroomCard } from "@/features/classrooms/components/classroom-card";
import { JoinClassroomDialog } from "@/features/classrooms/components/join-classroom-dialog";

export function ClassroomListPage() {
  const router = useRouter();
  const classroomsQuery = useStudentClassrooms();
  const [joinOpen, setJoinOpen] = useState(false);

  const classrooms = classroomsQuery.data?.results ?? [];

  const handleJoined = (classroomId: number) => {
    router.push(ROUTES.student.classroomDetail(classroomId));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My classrooms</h1>
          <p className="mt-1 text-sm text-slate-600">
            Join a classroom with a code from your teacher to see lessons and quizzes.
          </p>
        </div>
        <Button onClick={() => setJoinOpen(true)} className="shrink-0">
          Join a classroom
        </Button>
      </div>

      {classroomsQuery.isPending ? (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading your classrooms"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : classroomsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load your classrooms. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => classroomsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : classrooms.length === 0 ? (
        <EmptyState
          title="You have not joined any classrooms yet"
          description="Ask your teacher for a classroom code, then use the button above to join. Your classrooms and lessons will show up here."
          action={<Button onClick={() => setJoinOpen(true)}>Join a classroom</Button>}
        />
      ) : (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <li key={classroom.id}>
              <ClassroomCard classroom={classroom} />
            </li>
          ))}
        </ul>
      )}

      <JoinClassroomDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={handleJoined}
      />
    </div>
  );
}