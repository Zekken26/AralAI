import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  classroomListSchema,
  classroomSchema,
  enrollmentListSchema,
  joinClassroomResponseSchema,
} from "@/features/classrooms/schemas";
import type {
  Classroom,
  ClassroomCreateValues,
  ClassroomList,
  ClassroomUpdateValues,
  EnrollmentList,
  JoinClassroomResponse,
} from "@/types/classrooms";

export function listClassroomsRequest(): Promise<ClassroomList> {
  return apiRequest<unknown>({ method: "GET", url: "/classrooms/" }).then((data) =>
    parseOrThrow(classroomListSchema, data),
  );
}

export function getClassroomRequest(id: number): Promise<Classroom> {
  return apiRequest<unknown>({ method: "GET", url: `/classrooms/${id}/` }).then((data) =>
    parseOrThrow(classroomSchema, data),
  );
}

/** Join code is normalized to uppercase before sending (codes are stored uppercase). */
export function joinClassroomRequest(joinCode: string): Promise<JoinClassroomResponse> {
  return apiRequest<unknown>({
    method: "POST",
    url: "/classrooms/join/",
    data: { join_code: joinCode },
  }).then((data) => parseOrThrow(joinClassroomResponseSchema, data));
}

/** Teacher: create a classroom (classrooms the teacher owns). */
export function createClassroomRequest(values: ClassroomCreateValues): Promise<Classroom> {
  return apiRequest<unknown>({ method: "POST", url: "/classrooms/", data: values }).then((data) =>
    parseOrThrow(classroomSchema, data),
  );
}

/** Teacher: update an owned classroom (PATCH). */
export function updateClassroomRequest(
  classroomId: number,
  values: ClassroomUpdateValues,
): Promise<Classroom> {
  return apiRequest<unknown>({
    method: "PATCH",
    url: `/classrooms/${classroomId}/`,
    data: values,
  }).then((data) => parseOrThrow(classroomSchema, data));
}

/** Teacher: active student roster for an owned classroom. */
export function listClassroomStudentsRequest(classroomId: number): Promise<EnrollmentList> {
  return apiRequest<unknown>({
    method: "GET",
    url: `/classrooms/${classroomId}/students/`,
  }).then((data) => parseOrThrow(enrollmentListSchema, data));
}