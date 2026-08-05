import { Suspense } from "react";

import type { Metadata } from "next";

import { ClassroomDetailPage } from "@/features/classrooms/components/classroom-detail";

export const metadata: Metadata = {
  title: "Classroom | AralAI",
};

export default async function ClassroomRoute({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const id = Number(classroomId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <ClassroomDetailPage classroomId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}