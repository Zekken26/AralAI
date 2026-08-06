"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { displayPercent } from "@/features/analytics/utils/format";
import { analyticsErrorMessage, NO_PROGRESS_DATA_YET } from "@/features/analytics/utils/errors";
import { useTopicAnalytics } from "@/features/analytics/hooks/use-teacher-analytics";
import { MasteryDistribution } from "@/features/analytics/components/mastery-distribution";
import { ScoreTable } from "@/features/analytics/components/score-table";
import { StatCard } from "@/features/analytics/components/stat-card";
import { distributionDescription } from "@/features/analytics/utils/format";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "NEEDS_SUPPORT", label: "Needs support" },
  { value: "DEVELOPING", label: "Developing" },
  { value: "PROFICIENT", label: "Proficient" },
  { value: "MASTERED", label: "Mastered" },
];

export function TopicAnalyticsPage({
  classroomId,
  topicId,
}: {
  classroomId: number;
  topicId: number;
}) {
  const topicQuery = useTopicAnalytics(classroomId, topicId);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const data = topicQuery.data;
    if (!data) {
      return [];
    }
    const query = search.trim().toLowerCase();
    return data.students.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const name =
        `${row.student.first_name} ${row.student.last_name}`.trim().toLowerCase() ||
        `student #${row.student.id}`;
      return name.includes(query);
    });
  }, [topicQuery.data, statusFilter, search]);

  if (topicQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (topicQuery.isError || !topicQuery.data) {
    return (
      <ErrorAlert>
        <p>{analyticsErrorMessage(topicQuery.error)}</p>
        <Button variant="secondary" size="sm" onClick={() => topicQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const topic = topicQuery.data;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {topic.topic.title ?? `Topic #${topic.topic.id}`}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {topic.topic.code ?? "No code"} · Topic analytics
          </p>
        </div>
        <Link href={ROUTES.teacher.classroomAnalytics(classroomId)}>
          <Button variant="ghost">&larr; Back to classroom analytics</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Average mastery" value={displayPercent(topic.average_mastery)} />
        <StatCard label="Students attempted" value={topic.attempted_students} />
      </div>

      {topic.attempted_students === 0 ? (
        <EmptyState
          title={NO_PROGRESS_DATA_YET}
          description="Once students submit quizzes that cover this topic, their mastery will appear here."
        />
      ) : (
        <>
          <section aria-labelledby="topic-distribution-heading" className="flex flex-col gap-3">
            <h2 id="topic-distribution-heading" className="text-lg font-semibold text-slate-900">
              Mastery status distribution
            </h2>
            <Card>
              <MasteryDistribution
                distribution={topic.distribution}
                ariaLabel={`${distributionDescription(topic.distribution)} for ${topic.topic.title ?? `topic ${topic.topic.id}`}`}
              />
            </Card>
          </section>

          <section aria-labelledby="topic-students-heading" className="flex flex-col gap-3">
            <h2 id="topic-students-heading" className="text-lg font-semibold text-slate-900">
              Students
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="sm:w-64">
                <Input
                  label="Search students"
                  placeholder="Search by name"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="sm:w-56">
                <Select
                  label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  options={STATUS_FILTERS}
                />
              </div>
            </div>
            <ScoreTable
              rows={rows}
              caption={`Mastery scores for ${topic.topic.title ?? `topic ${topic.topic.id}`}.`}
              nameRenderer={(row) => (
                <Link
                  href={ROUTES.teacher.studentAnalytics(classroomId, row.student.id)}
                  className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  {`${row.student.first_name} ${row.student.last_name}`.trim() ||
                    `Student #${row.student.id}`}
                </Link>
              )}
              actionRenderer={(row) => (
                <Link
                  href={ROUTES.teacher.studentAnalytics(classroomId, row.student.id)}
                  className="rounded text-sm font-medium text-teal-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                >
                  View progress
                </Link>
              )}
              emptyMessage={
                topic.students.length === 0
                  ? NO_PROGRESS_DATA_YET
                  : "No students match the current filter."
              }
            />
          </section>
        </>
      )}
    </div>
  );
}