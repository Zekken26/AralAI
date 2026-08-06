import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveLessonRequest,
  createLessonRequest,
  getLessonRequest,
  listLessonsRequest,
  publishLessonRequest,
  updateLessonRequest,
  type LessonListParams,
} from "@/features/lessons/api/lessons.api";
import type { LessonCreateValues } from "@/types/lessons";

export const TEACHER_LESSONS_KEY = ["teacher", "lessons"] as const;

export function teacherLessonsKey(filters?: LessonListParams) {
  return ["teacher", "lessons", filters ?? {}] as const;
}

export function teacherLessonKey(lessonId: number) {
  return ["teacher", "lessons", lessonId] as const;
}

/** Lessons the teacher authored, filtered by classroom/topic/status. */
export function useTeacherLessons(
  filters?: LessonListParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: teacherLessonsKey(filters),
    queryFn: () => listLessonsRequest(filters),
    enabled: options?.enabled ?? true,
  });
}

/** Single lesson detail. Access-checked by the backend (404 when not owned). */
export function useTeacherLesson(lessonId?: number) {
  return useQuery({
    queryKey: teacherLessonKey(lessonId ?? 0),
    queryFn: () => getLessonRequest(lessonId as number),
    enabled: lessonId != null,
  });
}

export function useCreateLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LessonCreateValues) => createLessonRequest(values),
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_LESSONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["teacher", "lessons", lesson.classroom] });
    },
  });
}

export function useUpdateLesson(lessonId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LessonCreateValues) =>
      updateLessonRequest(lessonId as number, values),
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_LESSONS_KEY });
      queryClient.invalidateQueries({ queryKey: teacherLessonKey(lesson.id) });
    },
  });
}

export function usePublishLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: number) => publishLessonRequest(lessonId),
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_LESSONS_KEY });
      queryClient.invalidateQueries({ queryKey: teacherLessonKey(lesson.id) });
    },
  });
}

export function useArchiveLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: number) => archiveLessonRequest(lessonId),
    onSuccess: (lesson) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_LESSONS_KEY });
      queryClient.invalidateQueries({ queryKey: teacherLessonKey(lesson.id) });
    },
  });
}