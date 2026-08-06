import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherLessonDetailPage } from "@/features/lessons/components/teacher-lesson-detail-page";

export const metadata: Metadata = {
  title: "Lesson | AralAI",
};

export default async function LessonDetailRoute({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const id = Number(lessonId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherLessonDetailPage lessonId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}