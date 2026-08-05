import type { Metadata } from "next";

import { LessonDetailPage } from "@/features/lessons/components/lesson-detail";

export const metadata: Metadata = {
  title: "Lesson | AralAI",
};

export default async function LessonRoute({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const id = Number(lessonId);

  return <LessonDetailPage lessonId={Number.isInteger(id) && id > 0 ? id : 0} />;
}