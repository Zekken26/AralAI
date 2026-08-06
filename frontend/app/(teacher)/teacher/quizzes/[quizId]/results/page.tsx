import { Suspense } from "react";

import type { Metadata } from "next";

import { TeacherQuizResultsPage } from "@/features/quizzes/components/teacher-quiz-results-page";

export const metadata: Metadata = {
  title: "Results | AralAI",
};

export default async function QuizResultsRoute({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const id = Number(quizId);

  // Non-numeric ids cannot exist; rendering with 0 produces the 404 state.
  return (
    <Suspense fallback={null}>
      <TeacherQuizResultsPage quizId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}