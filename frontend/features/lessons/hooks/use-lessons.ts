import { useMemo } from "react";

import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import {
  getLessonRequest,
  getTopicRequest,
  listLessonsRequest,
  type LessonListParams,
} from "@/features/lessons/api/lessons.api";
import type { Lesson, Topic } from "@/types/lessons";

export function lessonsKey(classroomId?: number, topicId?: number, page?: number) {
  return ["lessons", { classroomId, topicId, page }] as const;
}

export function lessonDetailKey(lessonId: number) {
  return ["lessons", lessonId] as const;
}

export function topicKey(topicId: number) {
  return ["topics", topicId] as const;
}

type UseStudentLessonsOptions = LessonListParams & {
  /** Enable the query even without a classroom filter (e.g. dashboard "recent"). */
  enabled?: boolean;
};

/**
 * Published lessons visible to the student, paginated by the backend
 * (page size fixed at 20). Requires `classroomId` unless `enabled` is set.
 */
export function useStudentLessons({ classroom, topic, page = 1, enabled }: UseStudentLessonsOptions) {
  return useQuery({
    queryKey: lessonsKey(classroom, topic, page),
    queryFn: () => listLessonsRequest({ classroom, topic, page }),
    enabled: enabled ?? classroom != null,
    placeholderData: keepPreviousData,
  });
}

export function useStudentLesson(lessonId?: number) {
  return useQuery({
    queryKey: lessonDetailKey(lessonId ?? 0),
    queryFn: () => getLessonRequest(lessonId as number),
    enabled: lessonId != null,
  });
}

export function useTopic(topicId?: number) {
  return useQuery({
    queryKey: topicKey(topicId ?? 0),
    queryFn: () => getTopicRequest(topicId as number),
    enabled: topicId != null,
    staleTime: 5 * 60_000,
  });
}

/**
 * Resolves the topic names for a set of lessons (lesson responses carry only
 * topic ids). Returns a map keyed by topic id, with deterministic ordering.
 */
export function useTopicsForLessons(lessons: Lesson[] | undefined): { topics: Topic[]; loaded: boolean } {
  const topicIds = useMemo(
    () => [...new Set((lessons ?? []).map((lesson) => lesson.topic))],
    [lessons],
  );

  const topicQueries = useQueries({
    queries: topicIds.map((id) => ({
      queryKey: topicKey(id),
      queryFn: () => getTopicRequest(id),
      staleTime: 5 * 60_000,
    })),
  });

  const topics = useMemo(
    () =>
      topicQueries
        .map((query) => query.data)
        .filter((topic): topic is Topic => topic != null)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [topicQueries],
  );

  return { topics, loaded: topicQueries.every((query) => query.isSuccess) };
}