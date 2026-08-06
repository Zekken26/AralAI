import type { Metadata } from "next";

import { TeacherLessonCreatePage } from "@/features/lessons/components/teacher-lesson-form";

export const metadata: Metadata = {
  title: "New lesson | AralAI",
};

export default function LessonCreateRoute() {
  return <TeacherLessonCreatePage />;
}