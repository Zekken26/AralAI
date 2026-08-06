"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { formatDate } from "@/lib/format";
import {
  useTeacherClassroom,
  useTeacherClassroomStudents,
} from "@/features/classrooms/hooks/use-teacher-classrooms";

export function TeacherClassroomStudentsPage({ classroomId }: { classroomId: number }) {
  const classroomQuery = useTeacherClassroom(classroomId);
  const studentsQuery = useTeacherClassroomStudents(classroomId);
  const students = studentsQuery.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {classroomQuery.data?.name ?? "Students"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">Active students in this classroom.</p>
        </div>
        <Link href={ROUTES.teacher.classroomDetail(classroomId)}>
          <Button variant="ghost">&larr; Back to classroom</Button>
        </Link>
      </div>

      {studentsQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : studentsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load the student roster right now.</p>
          <Button variant="secondary" size="sm" onClick={() => studentsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : students.length === 0 ? (
        <EmptyState
          title="No students have joined yet"
          description="Share the classroom join code so students can enroll and see your lessons."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Student</th>
                <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {`${enrollment.student.first_name} ${enrollment.student.last_name}`.trim() ||
                      `Student #${enrollment.student.id}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(enrollment.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}