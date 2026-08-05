import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { lessonListSchema, lessonSchema, topicSchema } from "@/features/lessons/schemas";
import type { Lesson, LessonList, Topic } from "@/types/lessons";

export type LessonListParams = {
  /** Filter lessons to a classroom (required for meaningful student results). */
  classroom?: number;
  /** Filter lessons to a curriculum topic. */
  topic?: number;
  /** 1-based page number (backend page size is fixed at 20). */
  page?: number;
};

export function listLessonsRequest(params: LessonListParams = {}): Promise<LessonList> {
  return apiRequest<unknown>({ method: "GET", url: "/lessons/", params }).then((data) =>
    parseOrThrow(lessonListSchema, data),
  );
}

export function getLessonRequest(id: number): Promise<Lesson> {
  return apiRequest<unknown>({ method: "GET", url: `/lessons/${id}/` }).then((data) =>
    parseOrThrow(lessonSchema, data),
  );
}

export function getTopicRequest(id: number): Promise<Topic> {
  return apiRequest<unknown>({ method: "GET", url: `/topics/${id}/` }).then((data) =>
    parseOrThrow(topicSchema, data),
  );
}