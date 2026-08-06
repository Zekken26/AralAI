import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherClassroomStudentsPage } from "@/features/classrooms/components/teacher-classroom-students-page";

export const metadata: Metadata = {
  title: "Students | AralAI",
};

export default async function ClassroomStudentsRoute({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const id = Number(classroomId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherClassroomStudentsPage classroomId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}