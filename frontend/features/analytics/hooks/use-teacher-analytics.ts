import { useQuery } from "@tanstack/react-query";

import {
  classroomProgressRequest,
  classroomSupportRequest,
  classroomTopicProgressRequest,
  teacherStudentProgressRequest,
} from "@/features/analytics/api/teacher-analytics.api";

export function classroomAnalyticsKey(classroomId: number) {
  return ["teacher", "analytics", "classroom", classroomId] as const;
}

export function classroomSupportKey(classroomId: number) {
  return ["teacher", "analytics", "classroom", classroomId, "support"] as const;
}

export function classroomTopicAnalyticsKey(classroomId: number, topicId: number) {
  return ["teacher", "analytics", "classroom", classroomId, "topic", topicId] as const;
}

export function teacherStudentAnalyticsKey(classroomId: number, studentId: number) {
  return ["teacher", "analytics", "classroom", classroomId, "student", studentId] as const;
}

/** Class-wide topic mastery overview. Enabled only when the id is known. */
export function useClassroomAnalytics(classroomId?: number) {
  return useQuery({
    queryKey: classroomAnalyticsKey(classroomId ?? 0),
    queryFn: () => classroomProgressRequest(classroomId as number),
    enabled: classroomId != null,
  });
}

/** Students needing support in an owned classroom. */
export function useClassroomSupport(classroomId?: number) {
  return useQuery({
    queryKey: classroomSupportKey(classroomId ?? 0),
    queryFn: () => classroomSupportRequest(classroomId as number),
    enabled: classroomId != null,
  });
}

/** Per-student mastery for one topic in an owned classroom. */
export function useTopicAnalytics(classroomId?: number, topicId?: number) {
  return useQuery({
    queryKey: classroomTopicAnalyticsKey(classroomId ?? 0, topicId ?? 0),
    queryFn: () => classroomTopicProgressRequest(classroomId as number, topicId as number),
    enabled: classroomId != null && topicId != null,
  });
}

/** One student's mastery in an owned classroom. */
export function useStudentAnalytics(classroomId?: number, studentId?: number) {
  return useQuery({
    queryKey: teacherStudentAnalyticsKey(classroomId ?? 0, studentId ?? 0),
    queryFn: () =>
      teacherStudentProgressRequest(classroomId as number, studentId as number),
    enabled: classroomId != null && studentId != null,
  });
}
