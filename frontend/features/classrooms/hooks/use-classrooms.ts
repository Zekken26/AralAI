import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getClassroomRequest,
  joinClassroomRequest,
  listClassroomsRequest,
} from "@/features/classrooms/api/classrooms.api";

export const STUDENT_CLASSROOMS_KEY = ["classrooms", "student"] as const;

export function classroomDetailKey(classroomId: number) {
  return ["classrooms", classroomId] as const;
}

/** All classrooms the student is actively enrolled in. */
export function useStudentClassrooms() {
  return useQuery({
    queryKey: STUDENT_CLASSROOMS_KEY,
    queryFn: () => listClassroomsRequest(),
  });
}

/** Single classroom detail. Access-checked by the backend (404 when not enrolled). */
export function useStudentClassroom(classroomId?: number) {
  return useQuery({
    queryKey: classroomDetailKey(classroomId ?? 0),
    queryFn: () => getClassroomRequest(classroomId as number),
    enabled: classroomId != null,
  });
}

/** Join a classroom by code; on success invalidates the student classroom list. */
export function useJoinClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (joinCode: string) => joinClassroomRequest(joinCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_CLASSROOMS_KEY });
    },
  });
}