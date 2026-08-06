import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherQuizEditPage } from "@/features/quizzes/components/teacher-quiz-form";

export const metadata: Metadata = {
  title: "Edit quiz | AralAI",
};

export default async function QuizEditRoute({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const id = Number(quizId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherQuizEditPage quizId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}