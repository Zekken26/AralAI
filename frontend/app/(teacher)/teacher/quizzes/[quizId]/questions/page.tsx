import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherQuizQuestionsPage } from "@/features/quizzes/components/teacher-quiz-questions-page";

export const metadata: Metadata = {
  title: "Questions | AralAI",
};

export default async function QuizQuestionsRoute({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const id = Number(quizId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherQuizQuestionsPage quizId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}