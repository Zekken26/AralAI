import type { Metadata } from "next";

import { TeacherLessonListPage } from "@/features/lessons/components/teacher-lesson-list-page";

export const metadata: Metadata = {
  title: "Lessons | AralAI",
};

export default function LessonsRoute() {
  return <TeacherLessonListPage />;
}