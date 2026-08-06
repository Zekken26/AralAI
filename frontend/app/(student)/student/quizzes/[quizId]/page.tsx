import type { Metadata } from "next";

import { QuizDetailPage } from "@/features/quizzes/components/quiz-detail";

export const metadata: Metadata = {
  title: "Quiz detail | AralAI",
};

export default function QuizDetailRoute({ params }: { params: { quizId: string } }) {
  return <QuizDetailPage quizId={Number(params.quizId)} />;
}