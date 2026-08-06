import type { Metadata } from "next";

import { QuizListPage } from "@/features/quizzes/components/quiz-list";

export const metadata: Metadata = {
  title: "Quizzes | AralAI",
};

export default function QuizzesRoute() {
  return <QuizListPage />;
}