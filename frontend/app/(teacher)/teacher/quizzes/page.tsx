import type { Metadata } from "next";

import { TeacherQuizListPage } from "@/features/quizzes/components/teacher-quiz-list-page";

export const metadata: Metadata = {
  title: "Quizzes | AralAI",
};

export default function QuizzesRoute() {
  return <TeacherQuizListPage />;
}