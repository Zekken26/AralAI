import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherClassroomDetailPage } from "@/features/classrooms/components/teacher-classroom-detail-page";

export const metadata: Metadata = {
  title: "Classroom | AralAI",
};

export default async function ClassroomDetailRoute({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const id = Number(classroomId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherClassroomDetailPage classroomId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}