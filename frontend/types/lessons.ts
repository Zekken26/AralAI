import { z } from "zod";

import { paginatedSchema } from "@/types/pagination";

/** Curriculum subjects (SubjectSerializer). */
export const subjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  code: z.string(),
  is_active: z.boolean(),
});

export type Subject = z.infer<typeof subjectSchema>;

/** Topic detail (TopicDetailSerializer) — subject is an embedded object. */
export const topicSchema = z.object({
  id: z.number().int().positive(),
  subject: subjectSchema,
  grade_level: z.number().int(),
  code: z.string(),
  title: z.string(),
  description: z.string(),
  sequence_order: z.number().int(),
});

export type Topic = z.infer<typeof topicSchema>;

/** Non-sensitive lesson author info (UserSummarySerializer). */
export const lessonAuthorSchema = z.object({
  id: z.number().int(),
  first_name: z.string(),
  last_name: z.string(),
});

export type LessonAuthor = z.infer<typeof lessonAuthorSchema>;

/**
 * Matches LessonSerializer. `topic` and `classroom` are plain integer ids —
 * the backend does not embed names. `content` is a plain-text string (the
 * model is a TextField, not JSON or Markdown).
 */
export const lessonSchema = z.object({
  id: z.number().int().positive(),
  topic: z.number().int(),
  classroom: z.number().int(),
  author: lessonAuthorSchema,
  title: z.string(),
  summary: z.string(),
  learning_objectives: z.array(z.string()),
  content: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  version: z.number().int().nonnegative(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Lesson = z.infer<typeof lessonSchema>;

export const lessonListSchema = paginatedSchema(lessonSchema);
export type LessonList = z.infer<typeof lessonListSchema>;

/**
 * Teacher create/update lesson form (LessonCreateSerializer / LessonUpdateSerializer).
 * `topic` and `classroom` are plain integer ids; objectives are plain strings.
 */
export const lessonCreateSchema = z.object({
  topic: z.number({ message: "Choose a topic." }).int().positive(),
  classroom: z.number({ message: "Choose a classroom." }).int().positive(),
  title: z.string().trim().min(1, "Enter a lesson title.").max(200, "The title is too long."),
  summary: z.string().max(2000, "The summary is too long."),
  learning_objectives: z.array(z.string().trim().min(1, "Objectives cannot be empty.")),
  content: z.string().min(1, "Lesson content cannot be empty."),
});

export type LessonCreateValues = z.infer<typeof lessonCreateSchema>;