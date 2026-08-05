import { apiRequest } from "@/lib/api-client";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  classroomListSchema,
  classroomSchema,
  joinClassroomResponseSchema,
} from "@/features/classrooms/schemas";
import type { Classroom, ClassroomList, JoinClassroomResponse } from "@/types/classrooms";

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