import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";

import {
  classroomProgressSchema,
  classroomTopicProgressSchema,
  studentsNeedingSupportSchema,
  teacherStudentProgressSchema,
} from "@/features/analytics/schemas/teacher";
import type {
  ClassroomProgress,
  ClassroomTopicProgress,
  StudentsNeedingSupport,
  TeacherStudentProgress,
} from "@/features/analytics/types";

/** Class-wide topic mastery overview for an owned classroom. */
export function classroomProgressRequest(classroomId: number): Promise<ClassroomProgress> {
  return apiRequest<unknown>({ method: "GET", url: `/classrooms/${classroomId}/progress/` }).then(
    (data) => parseOrThrow(classroomProgressSchema, data),
  );
}

/** Students with at least one topic in NEEDS_SUPPORT in an owned classroom. */
export function classroomSupportRequest(classroomId: number): Promise<StudentsNeedingSupport> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/classrooms/${classroomId}/students-needing-support/`,
  }).then((data) => parseOrThrow(studentsNeedingSupportSchema, data));
}

/** Per-student mastery breakdown for one topic in an owned classroom. */
export function classroomTopicProgressRequest(
  classroomId: number,
  topicId: number,
): Promise<ClassroomTopicProgress> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/classrooms/${classroomId}/topics/${topicId}/progress/`,
  }).then((data) => parseOrThrow(classroomTopicProgressSchema, data));
}

/** One student's mastery over the topics taught in an owned classroom. */
export function teacherStudentProgressRequest(
  classroomId: number,
  studentId: number,
): Promise<TeacherStudentProgress> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/classrooms/${classroomId}/students/${studentId}/progress/`,
  }).then((data) => parseOrThrow(teacherStudentProgressSchema, data));
}
