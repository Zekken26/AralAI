import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherQuizDetailPage } from "@/features/quizzes/components/teacher-quiz-detail-page";

export const metadata: Metadata = {
  title: "Quiz | AralAI",
};

export default async function QuizDetailRoute({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const id = Number(quizId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherQuizDetailPage quizId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}