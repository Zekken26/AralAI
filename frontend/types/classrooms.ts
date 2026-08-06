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

/** Join classroom invite. Codes are generated uppercase; the backend matches exactly. */
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

/** Non-sensitive student summary inside an enrollment (UserSummarySerializer). */
export const enrollmentStudentSchema = z.object({
  id: z.number().int(),
  first_name: z.string(),
  last_name: z.string(),
});

export type EnrollmentStudent = z.infer<typeof enrollmentStudentSchema>;

/** Teacher-facing enrollment row (EnrollmentSerializer). */
export const enrollmentSchema = z.object({
  id: z.number().int().positive(),
  student: enrollmentStudentSchema,
  status: z.string(),
  joined_at: z.string(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

export const enrollmentListSchema = paginatedSchema(enrollmentSchema);
export type EnrollmentList = z.infer<typeof enrollmentListSchema>;

/** Teacher create-classroom form (ClassroomCreateSerializer). */
export const classroomCreateSchema = z.object({
  name: z.string().trim().min(1, "Enter a classroom name.").max(200, "The name is too long."),
  section: z.string().trim().max(100, "The section is too long.").optional(),
  school_year: z.string().trim().max(50, "The school year is too long.").optional(),
});

export type ClassroomCreateValues = z.infer<typeof classroomCreateSchema>;

/** Teacher update-classroom form (ClassroomUpdateSerializer). */
export const classroomUpdateSchema = z.object({
  name: z.string().trim().min(1, "Enter a classroom name.").max(200, "The name is too long."),
  section: z.string().trim().max(100, "The section is too long.").optional(),
  school_year: z.string().trim().max(50, "The school year is too long.").optional(),
  is_active: z.boolean(),
});

export type ClassroomUpdateValues = z.infer<typeof classroomUpdateSchema>;