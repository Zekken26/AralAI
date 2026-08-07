import { Suspense } from "react";

import type { Metadata } from "next";

import { StudentLessonsPage } from "@/features/lessons/components/student-lessons-page";

export const metadata: Metadata = {
  title: "Lessons | AralAI",
};

export default async function LessonsRoute() {
  return (
    <Suspense fallback={null}>
      <StudentLessonsPage />
    </Suspense>
  );
}