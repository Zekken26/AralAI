import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  listSubjectTopicsRequest,
  listSubjectsRequest,
  getSubjectRequest,
  getTopicRequest,
} from "@/features/curriculum/api/curriculum.api";

export function subjectsKey() {
  return ["curriculum", "subjects"] as const;
}

export function subjectTopicsKey(subjectId: number) {
  return ["curriculum", "subjects", subjectId, "topics"] as const;
}

export function subjectKey(subjectId: number) {
  return ["curriculum", "subjects", subjectId] as const;
}

export function topicKey(topicId: number) {
  return ["curriculum", "topics", topicId] as const;
}

/** Active curriculum subjects for form dropdowns. */
export function useSubjects() {
  return useQuery({
    queryKey: subjectsKey(),
    queryFn: () => listSubjectsRequest(),
    staleTime: 5 * 60_000,
  });
}

/** Topics of a subject, enabled only when a subject is selected. */
export function useSubjectTopics(subjectId?: number) {
  return useQuery({
    queryKey: subjectTopicsKey(subjectId ?? 0),
    queryFn: () => listSubjectTopicsRequest(subjectId as number),
    enabled: subjectId != null,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useSubject(subjectId?: number) {
  return useQuery({
    queryKey: subjectKey(subjectId ?? 0),
    queryFn: () => getSubjectRequest(subjectId as number),
    enabled: subjectId != null,
    staleTime: 5 * 60_000,
  });
}

export function useCurriculumTopic(topicId?: number) {
  return useQuery({
    queryKey: topicKey(topicId ?? 0),
    queryFn: () => getTopicRequest(topicId as number),
    enabled: topicId != null,
    staleTime: 5 * 60_000,
  });
}
