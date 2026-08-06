"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { ROUTES } from "@/lib/routes";
import { describeScores, displayPercent } from "@/features/analytics/utils/format";
import { analyticsErrorMessage, NO_PROGRESS_DATA_YET } from "@/features/analytics/utils/errors";
import { useStudentAnalytics } from "@/features/analytics/hooks/use-teacher-analytics";
import { ScoreTable } from "@/features/analytics/components/score-table";
import { StatCard } from "@/features/analytics/components/stat-card";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  { value: "NEEDS_SUPPORT", label: "Needs support" },
  { value: "DEVELOPING", label: "Developing" },
  { value: "PROFICIENT", label: "Proficient" },
  { value: "MASTERED", label: "Mastered" },
];

export function StudentAnalyticsPage({
  classroomId,
  studentId,
}: {
  classroomId: number;
  studentId: number;
}) {
  const studentQuery = useStudentAnalytics(classroomId, studentId);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const rows = useMemo(() => {
    const data = studentQuery.data;
    if (!data) {
      return [];
    }
    if (statusFilter === "ALL") {
      return data.topics;
    }
    return data.topics.filter((row) => row.status === statusFilter);
  }, [studentQuery.data, statusFilter]);

  if (studentQuery.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <ErrorAlert>
        <p>{analyticsErrorMessage(studentQuery.error)}</p>
        <Button variant="secondary" size="sm" onClick={() => studentQuery.refetch()} className="mt-1">
          Retry
        </Button>
      </ErrorAlert>
    );
  }

  const student = studentQuery.data;
  const studentName =
    `${student.student.first_name} ${student.student.last_name}`.trim() ||
    `Student #${student.student.id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{studentName}</h1>
          <p className="mt-1 text-sm text-slate-600">Student progress</p>
        </div>
        <Link href={ROUTES.teacher.classroomAnalytics(classroomId)}>
          <Button variant="ghost">&larr; Back to classroom analytics</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overall mastery"
          value={displayPercent(student.overall_mastery_average)}
        />
        <StatCard label="Topics attempted" value={student.topics_attempted} />
        <StatCard label="Topics mastered" value={student.topics_mastered} />
        <StatCard label="Topics needing support" value={student.topics_needing_support} />
      </div>

      <p className="text-sm text-slate-600" aria-label="Score overview">
        {describeScores(student.topics.map((row) => row.mastery_score))}
      </p>

      <section aria-labelledby="student-topics-heading" className="flex flex-col gap-3">
        <h2 id="student-topics-heading" className="text-lg font-semibold text-slate-900">
          Topic mastery
        </h2>
        <div className="sm:w-56">
          <Select
            label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_FILTERS}
          />
        </div>
        {student.topics_attempted === 0 ? (
          <EmptyState
            title={NO_PROGRESS_DATA_YET}
            description="Once this student submits quizzes in this classroom, their topic mastery will appear here."
          />
        ) : (
          <ScoreTable
            rows={rows}
            caption={`Mastery scores for ${studentName}.`}
            nameRenderer={(row) => (
              <span>
                {row.topic.title}
                <span className="ml-2 text-xs font-medium text-slate-500">{row.topic.code}</span>
              </span>
            )}
            emptyMessage="No topics match the current filter."
          />
        )}
      </section>
    </div>
  );
}