import { z } from "zod";

import { paginatedSchema } from "@/types/pagination";

/** Matches ClassroomSerializer. Note: student-facing responses omit teacher info. */
export const classroomSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  section: z.string(),
  school_year: z.string(),
  join_code: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Classroom = z.infer<typeof classroomSchema>;

export const classroomListSchema = paginatedSchema(classroomSchema);
export type ClassroomList = z.infer<typeof classroomListSchema>;

/** Join-code input. Codes are generated uppercase; the backend matches exactly. */
export const joinClassroomCodeSchema = z
  .string()
  .trim()
  .min(1, "Enter your classroom code.")
  .max(16, "The classroom code is too long.")
  .transform((value) => value.toUpperCase());

export const joinClassroomResponseSchema = z.object({
  id: z.number().int().positive(),
  classroom: z.number().int().positive(),
  status: z.string(),
});

export type JoinClassroomResponse = z.infer<typeof joinClassroomResponseSchema>;