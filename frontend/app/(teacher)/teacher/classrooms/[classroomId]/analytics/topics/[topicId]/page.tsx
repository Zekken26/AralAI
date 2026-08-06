import { Suspense } from "react";

import type { Metadata } from "next";

import { TopicAnalyticsPage } from "@/features/analytics/components/topic-analytics-page";

export const metadata: Metadata = {
  title: "Topic analytics — AralAI",
};

export default async function TopicAnalyticsRoute({
  params,
}: {
  params: Promise<{ classroomId: string; topicId: string }>;
}) {
  const { classroomId, topicId } = await params;
  const classroomIdNumber = Number(classroomId);
  const topicIdNumber = Number(topicId);

  return (
    <Suspense fallback={null}>
      <TopicAnalyticsPage
        classroomId={Number.isInteger(classroomIdNumber) && classroomIdNumber > 0 ? classroomIdNumber : 0}
        topicId={Number.isInteger(topicIdNumber) && topicIdNumber > 0 ? topicIdNumber : 0}
      />
    </Suspense>
  );
}