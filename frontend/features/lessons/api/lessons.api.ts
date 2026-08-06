import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { lessonListSchema, lessonSchema, topicSchema } from "@/features/lessons/schemas";
import type { Lesson, LessonCreateValues, LessonList, Topic } from "@/types/lessons";

export type LessonListParams = {
  /** Filter lessons to a classroom (required for meaningful student results). */
  classroom?: number;
  /** Filter lessons to a curriculum topic. */
  topic?: number;
  /** Filter lessons by publish status (teacher view). */
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
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

/** Teacher: create a lesson in an owned classroom. */
export function createLessonRequest(values: LessonCreateValues): Promise<Lesson> {
  return apiRequest<unknown>({ method: "POST", url: "/lessons/", data: values }).then((data) =>
    parseOrThrow(lessonSchema, data),
  );
}

/** Teacher: update a lesson the teacher authored (PATCH). */
export function updateLessonRequest(lessonId: number, values: LessonCreateValues): Promise<Lesson> {
  return apiRequest<unknown>({
    method: "PATCH",
    url: `/lessons/${lessonId}/`,
    data: values,
  }).then((data) => parseOrThrow(lessonSchema, data));
}

/** Teacher: publish a lesson the teacher authored. */
export function publishLessonRequest(lessonId: number): Promise<Lesson> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/lessons/${lessonId}/publish/`,
  }).then((data) => parseOrThrow(lessonSchema, data));
}

/** Teacher: archive a lesson the teacher authored. */
export function archiveLessonRequest(lessonId: number): Promise<Lesson> {
  return apiRequest<unknown>({
    method: "POST",
    url: `/lessons/${lessonId}/archive/`,
  }).then((data) => parseOrThrow(lessonSchema, data));
}