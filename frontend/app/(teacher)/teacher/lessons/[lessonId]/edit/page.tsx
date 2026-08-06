import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherLessonEditPage } from "@/features/lessons/components/teacher-lesson-form";

export const metadata: Metadata = {
  title: "Edit lesson | AralAI",
};

export default async function LessonEditRoute({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const id = Number(lessonId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherLessonEditPage lessonId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}