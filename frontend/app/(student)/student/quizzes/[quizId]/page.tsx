import { Suspense } from "react";

import type { Metadata } from "next";

import { QuizDetailPage } from "@/features/quizzes/components/quiz-detail";

export const metadata: Metadata = {
  title: "Quiz detail | AralAI",
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
      <QuizDetailPage quizId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}