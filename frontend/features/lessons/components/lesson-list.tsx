"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorAlert } from "@/components/feedback/error-alert";
import { LessonCard } from "@/features/lessons/components/lesson-card";
import { TopicFilter } from "@/features/lessons/components/topic-filter";
import type { Topic, LessonList } from "@/types/lessons";
import type { UseQueryResult } from "@tanstack/react-query";

export type LessonListQuery = UseQueryResult<LessonList, Error>;

/**
 * Presentational list of published lessons. The owning page supplies the query
 * result so counts and filters are shared from a single source of truth.
 */
export function LessonList({
  lessonsQuery,
  topicId,
  topics,
  topicsLoaded,
  page,
  onFilterChange,
}: {
  lessonsQuery: LessonListQuery;
  topicId?: number;
  topics: Topic[];
  topicsLoaded: boolean;
  page: number;
  onFilterChange: (topicId: number | undefined, page: number) => void;
}) {
  const lessons = lessonsQuery.data?.results ?? [];
  const topicNames = new Map(topics.map((topic) => [topic.id, topic.title]));

  return (
    <section className="flex flex-col gap-4" aria-label="Lessons">
      {topicsLoaded ? (
        <TopicFilter topics={topics} selected={topicId} onSelect={(next) => onFilterChange(next, 1)} />
      ) : null}

      {lessonsQuery.isPending && !lessonsQuery.isPlaceholderData ? (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2" aria-busy="true" aria-label="Loading lessons">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </li>
          ))}
        </ul>
      ) : lessonsQuery.isError ? (
        <ErrorAlert>
          <p>We could not load the lessons for this classroom. Please try again.</p>
          <Button variant="secondary" size="sm" onClick={() => lessonsQuery.refetch()} className="mt-1">
            Retry
          </Button>
        </ErrorAlert>
      ) : lessons.length === 0 ? (
        <EmptyState
          title="No published lessons yet"
          description="Your teacher has not published any lessons here yet. Check back soon."
        />
      ) : (
        <>
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard lesson={lesson} topicName={topicNames.get(lesson.topic)} />
              </li>
            ))}
          </ul>
          {lessonsQuery.data && (lessonsQuery.data.previous || lessonsQuery.data.next) ? (
            <nav className="flex items-center justify-between" aria-label="Lesson pages">
              <Button
                variant="secondary"
                size="sm"
                disabled={!lessonsQuery.data.previous}
                onClick={() => onFilterChange(topicId, Math.max(1, page - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-500">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!lessonsQuery.data.next}
                onClick={() => onFilterChange(topicId, page + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}