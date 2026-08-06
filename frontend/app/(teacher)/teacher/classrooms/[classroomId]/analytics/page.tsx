import { Suspense } from "react";

import type { Metadata } from "next";

import { ClassroomAnalyticsOverview } from "@/features/analytics/components/classroom-analytics-overview";

export const metadata: Metadata = {
  title: "Classroom analytics — AralAI",
};

export default async function ClassroomAnalyticsRoute({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const id = Number(classroomId);

  return (
    <Suspense fallback={null}>
      <ClassroomAnalyticsOverview classroomId={Number.isInteger(id) && id > 0 ? id : 0} />
    </Suspense>
  );
}