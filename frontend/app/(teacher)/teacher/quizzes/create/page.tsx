import type { Metadata } from "next";

import { TeacherQuizCreatePage } from "@/features/quizzes/components/teacher-quiz-form";

export const metadata: Metadata = {
  title: "New quiz | AralAI",
};

export default function QuizCreateRoute() {
  return <TeacherQuizCreatePage />;
}