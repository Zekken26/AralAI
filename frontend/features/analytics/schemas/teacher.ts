import { z } from "zod";

import { masteryStatusSchema, topicSummarySchema } from "@/features/progress/schemas";
import { enrollmentStudentSchema } from "@/types/classrooms";

/**
 * Teacher analytics transport schemas.
 *
 * Wire-format contract (locked by backend tests):
 * - The four classroom progress endpoints emit decimals as JSON NUMBERS
 *   (raw dicts rendered by DRF's JSONEncoder), e.g. 31.0.
 * - Quiz results endpoints emit decimals as STRINGS ("88.89") and are
 *   covered by the existing quiz schemas.
 * - `status` values are uppercase enums; distribution bucket keys are
 *   lowercase.
 */

export const masteryDistributionSchema = z.object({
  needs_support: z.number().int().nonnegative(),
  developing: z.number().int().nonnegative(),
  proficient: z.number().int().nonnegative(),
  mastered: z.number().int().nonnegative(),
});

export type MasteryDistribution = z.infer<typeof masteryDistributionSchema>;

export const topicAverageSchema = z.object({
  topic: topicSummarySchema,
  average_mastery: z.number().min(0).max(100).nullable(),
});

export const topicDistributionItemSchema = z.object({
  topic: topicSummarySchema,
  needs_support: z.number().int().nonnegative(),
  developing: z.number().int().nonnegative(),
  proficient: z.number().int().nonnegative(),
  mastered: z.number().int().nonnegative(),
  attempted_students: z.number().int().nonnegative(),
  submitted_attempts: z.number().int().nonnegative(),
  average_mastery: z.number().min(0).max(100),
});

export const classroomProgressSchema = z.object({
  classroom_id: z.number().int().positive(),
  class_average_mastery: z.number().min(0).max(100).nullable(),
  attempted_topics: z.number().int().nonnegative(),
  weakest_topics: z.array(topicAverageSchema),
  strongest_topics: z.array(topicAverageSchema),
  topic_distribution: z.array(topicDistributionItemSchema),
});

export type ClassroomProgress = z.infer<typeof classroomProgressSchema>;
export type TopicDistributionItem = z.infer<typeof topicDistributionItemSchema>;

const supportTopicSchema = z.object({
  topic: topicSummarySchema,
  mastery_score: z.number().min(0).max(100),
  status: z.literal("NEEDS_SUPPORT"),
});

export const studentSupportItemSchema = z.object({
  student: enrollmentStudentSchema,
  topics: z.array(supportTopicSchema),
});

export const studentsNeedingSupportSchema = z.object({
  count: z.number().int().nonnegative(),
  students: z.array(studentSupportItemSchema),
});

export type StudentsNeedingSupport = z.infer<typeof studentsNeedingSupportSchema>;
export type StudentSupportItem = z.infer<typeof studentSupportItemSchema>;

export const classroomTopicStudentSchema = z.object({
  student: enrollmentStudentSchema,
  mastery_score: z.number().min(0).max(100),
  status: masteryStatusSchema,
});

export const classroomTopicProgressSchema = z.object({
  topic: z.object({
    id: z.number().int().positive(),
    title: z.string().nullable(),
    code: z.string().nullable(),
  }),
  average_mastery: z.number().min(0).max(100).nullable(),
  attempted_students: z.number().int().nonnegative(),
  distribution: masteryDistributionSchema,
  students: z.array(classroomTopicStudentSchema),
});

export type ClassroomTopicProgress = z.infer<typeof classroomTopicProgressSchema>;
export type ClassroomTopicStudent = z.infer<typeof classroomTopicStudentSchema>;

export const teacherStudentTopicSchema = z.object({
  topic: topicSummarySchema,
  mastery_score: z.number().min(0).max(100),
  status: masteryStatusSchema,
});

export const teacherStudentProgressSchema = z.object({
  student: enrollmentStudentSchema,
  topics_attempted: z.number().int().nonnegative(),
  topics_mastered: z.number().int().nonnegative(),
  topics_needing_support: z.number().int().nonnegative(),
  overall_mastery_average: z.number().min(0).max(100).nullable(),
  topics: z.array(teacherStudentTopicSchema),
});

export type TeacherStudentProgress = z.infer<typeof teacherStudentProgressSchema>;
