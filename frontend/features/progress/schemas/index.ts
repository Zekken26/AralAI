import { z } from "zod";
import { paginatedSchema } from "@/types/pagination";

const masteryStatusSchema = z.enum(["NEEDS_SUPPORT", "DEVELOPING", "PROFICIENT", "MASTERED"]);
const recommendationTypeSchema = z.enum([
  "REVIEW_LESSON",
  "EASY_PRACTICE",
  "GUIDED_PRACTICE",
  "MIXED_PRACTICE",
  "ADVANCE_TOPIC",
  "SPACED_REVIEW",
]);
const recommendationPrioritySchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
const recommendationStatusSchema = z.enum(["ACTIVE", "COMPLETED", "DISMISSED", "EXPIRED"]);

const topicSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  code: z.string(),
});

const targetLessonSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
});

const targetQuizSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
});

export const recommendationSchema = z.object({
  id: z.number().int().positive(),
  topic: topicSummarySchema,
  recommendation_type: recommendationTypeSchema,
  priority: recommendationPrioritySchema,
  title: z.string().max(200),
  reason: z.string(),
  status: recommendationStatusSchema,
  target_lesson: targetLessonSchema.nullable(),
  target_quiz: targetQuizSchema.nullable(),
  generated_from_attempt: z.number().int().positive().nullable(),
  completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const recommendationListSchema = paginatedSchema(recommendationSchema);

const trendItemSchema = z.object({
  attempt: z.number().int().positive(),
  score: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  passed: z.boolean().nullable(),
  submitted_at: z.string().datetime(),
});

export const progressSummarySchema = z.object({
  overall_mastery_average: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  topics_attempted: z.number().int().nonnegative(),
  topics_mastered: z.number().int().nonnegative(),
  topics_needing_support: z.number().int().nonnegative(),
  total_submitted_attempts: z.number().int().nonnegative(),
  recent_performance_trend: z.array(trendItemSchema),
  trend_delta: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  last_activity_date: z.string().datetime().nullable(),
});

export const topicMasterySchema = z.object({
  id: z.number().int().positive(),
  topic: topicSummarySchema,
  mastery_score: z.string().regex(/^\d+(\.\d{1,2})?$/),
  status: masteryStatusSchema,
  recent_accuracy: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  difficulty_score: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  consistency_score: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  independent_score: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable(),
  total_questions_answered: z.number().int().nonnegative(),
  total_correct_answers: z.number().int().nonnegative(),
  total_points_earned: z.string().regex(/^\d+(\.\d{1,2})?$/),
  total_points_possible: z.string().regex(/^\d+(\.\d{1,2})?$/),
  first_attempted_at: z.string().datetime().nullable(),
  last_attempted_at: z.string().datetime().nullable(),
  last_recalculated_at: z.string().datetime(),
  active_recommendation_count: z.number().int().nonnegative(),
});

export const topicMasteryListSchema = paginatedSchema(topicMasterySchema);

export type Recommendation = z.infer<typeof recommendationSchema>;
export type RecommendationList = z.infer<typeof recommendationListSchema>;
export type ProgressSummary = z.infer<typeof progressSummarySchema>;
export type TopicMastery = z.infer<typeof topicMasterySchema>;
export type TopicMasteryList = z.infer<typeof topicMasteryListSchema>;