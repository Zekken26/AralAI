import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createClassroomRequest,
  getClassroomRequest,
  listClassroomStudentsRequest,
  listClassroomsRequest,
  updateClassroomRequest,
} from "@/features/classrooms/api/classrooms.api";
import type { ClassroomCreateValues, ClassroomUpdateValues } from "@/types/classrooms";

export const TEACHER_CLASSROOMS_KEY = ["teacher", "classrooms"] as const;

export function teacherClassroomKey(classroomId: number) {
  return ["teacher", "classrooms", classroomId] as const;
}

export function teacherClassroomStudentsKey(classroomId: number) {
  return ["teacher", "classrooms", classroomId, "students"] as const;
}

/**
 * Classrooms visible to a teacher (the backend scopes `GET /classrooms/` by
 * role, returning only classrooms the caller owns).
 */
export function useTeacherClassrooms() {
  return useQuery({
    queryKey: TEACHER_CLASSROOMS_KEY,
    queryFn: () => listClassroomsRequest(),
  });
}

/** Single classroom detail. Access-checked by the backend (404 when not owned). */
export function useTeacherClassroom(classroomId?: number) {
  return useQuery({
    queryKey: teacherClassroomKey(classroomId ?? 0),
    queryFn: () => getClassroomRequest(classroomId as number),
    enabled: classroomId != null,
  });
}

/** Active student roster for an owned classroom. */
export function useTeacherClassroomStudents(classroomId?: number) {
  return useQuery({
    queryKey: teacherClassroomStudentsKey(classroomId ?? 0),
    queryFn: () => listClassroomStudentsRequest(classroomId as number),
    enabled: classroomId != null,
  });
}

export function useCreateClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ClassroomCreateValues) => createClassroomRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEACHER_CLASSROOMS_KEY });
    },
  });
}

export function useUpdateClassroom(classroomId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ClassroomUpdateValues) =>
      updateClassroomRequest(classroomId as number, values),
    onSuccess: (classroom) => {
      queryClient.invalidateQueries({ queryKey: TEACHER_CLASSROOMS_KEY });
      queryClient.invalidateQueries({ queryKey: teacherClassroomKey(classroom.id) });
    },
  });
}