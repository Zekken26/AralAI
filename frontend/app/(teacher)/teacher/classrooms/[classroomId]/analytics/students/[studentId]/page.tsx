import { Suspense } from "react";

import type { Metadata } from "next";

import { StudentAnalyticsPage } from "@/features/analytics/components/student-analytics-page";

export const metadata: Metadata = {
  title: "Student progress — AralAI",
};

export default async function StudentAnalyticsRoute({
  params,
}: {
  params: Promise<{ classroomId: string; studentId: string }>;
}) {
  const { classroomId, studentId } = await params;
  const classroomIdNumber = Number(classroomId);
  const studentIdNumber = Number(studentId);

  return (
    <Suspense fallback={null}>
      <StudentAnalyticsPage
        classroomId={Number.isInteger(classroomIdNumber) && classroomIdNumber > 0 ? classroomIdNumber : 0}
        studentId={Number.isInteger(studentIdNumber) && studentIdNumber > 0 ? studentIdNumber : 0}
      />
    </Suspense>
  );
}