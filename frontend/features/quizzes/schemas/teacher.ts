import { z } from "zod";

import { paginatedSchema } from "@/types/pagination";

import { quizStatusSchema, questionTypeSchema } from "./index";

const attemptStatusSchema = z.enum(["IN_PROGRESS", "SUBMITTED", "EXPIRED"]);
const reviewStatusSchema = z.enum(["DRAFT", "APPROVED", "REJECTED"]);

const userSummarySchema = z.object({
  id: z.number().int(),
  first_name: z.string(),
  last_name: z.string(),
});

function decimalString(message: string) {
  return z.string().regex(/^\d+(\.\d+)?$/, message);
}

export const teacherQuizSchema = z.object({
  id: z.number().int().positive(),
  lesson: z.number().int().positive(),
  classroom: z.number().int().positive(),
  author: userSummarySchema,
  title: z.string().max(200),
  instructions: z.string(),
  status: quizStatusSchema,
  attempt_limit: z.number().int().positive().nullable(),
  time_limit_minutes: z.number().int().positive().nullable(),
  available_from: z.string().datetime().nullable(),
  available_until: z.string().datetime().nullable(),
  passing_score: decimalString("Invalid passing score."),
  randomize_questions: z.boolean(),
  show_results_immediately: z.boolean(),
  published_at: z.string().datetime().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  question_count: z.number().int().nonnegative(),
});

export type TeacherQuiz = z.infer<typeof teacherQuizSchema>;

export const teacherQuizListSchema = paginatedSchema(teacherQuizSchema);
export type TeacherQuizList = z.infer<typeof teacherQuizListSchema>;

export const teacherQuizWriteSchema = teacherQuizSchema.omit({ question_count: true });
export type TeacherQuizWrite = z.infer<typeof teacherQuizWriteSchema>;

export const teacherChoiceSchema = z.object({
  id: z.number().int().positive(),
  text: z.string().max(500),
  is_correct: z.boolean(),
  sequence_order: z.number().int(),
});

export type TeacherChoice = z.infer<typeof teacherChoiceSchema>;

export const teacherQuestionSchema = z.object({
  id: z.number().int().positive(),
  quiz: z.number().int().positive(),
  topic: z.number().int().positive(),
  question_type: questionTypeSchema,
  prompt: z.string(),
  explanation: z.string(),
  difficulty: z.number().int().min(1).max(5),
  points: decimalString("Invalid points."),
  numeric_answer: z.string().nullable(),
  numeric_tolerance: z.string().nullable(),
  is_ai_generated: z.boolean(),
  review_status: reviewStatusSchema,
  sequence_order: z.number().int(),
  choices: z.array(teacherChoiceSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TeacherQuestion = z.infer<typeof teacherQuestionSchema>;

export const teacherQuestionListSchema = z.array(teacherQuestionSchema);
export type TeacherQuestionList = z.infer<typeof teacherQuestionListSchema>;

export const teacherQuizDetailSchema = teacherQuizSchema
  .omit({ question_count: true })
  .extend({ questions: teacherQuestionListSchema });

export type TeacherQuizDetail = z.infer<typeof teacherQuizDetailSchema>;

export const quizCreateSchema = z.object({
  lesson: z.number({ message: "Choose a lesson." }).int().positive(),
  classroom: z.number({ message: "Choose a classroom." }).int().positive(),
  title: z.string().trim().min(1, "Enter a quiz title.").max(200, "The title is too long."),
  instructions: z.string().max(4000, "The instructions are too long."),
  attempt_limit: z.number().int().positive("Attempts must be a positive number.").optional().nullable(),
  time_limit_minutes: z.number().int().positive("Time limit must be a positive number.").optional().nullable(),
  available_from: z.string().nullable().optional(),
  available_until: z.string().nullable().optional(),
  passing_score: z.number().min(0, "Passing score must be between 0 and 100.").max(100, "Passing score must be between 0 and 100."),
  randomize_questions: z.boolean(),
  show_results_immediately: z.boolean(),
});

export type QuizCreateValues = z.infer<typeof quizCreateSchema>;

export const questionWriteSchema = z.object({
  topic: z.number({ message: "Choose a topic." }).int().positive(),
  question_type: questionTypeSchema,
  prompt: z.string().trim().min(1, "Enter the question prompt.").max(5000, "The prompt is too long."),
  explanation: z.string().max(4000, "The explanation is too long."),
  difficulty: z.number().int().min(1, "Difficulty must be between 1 and 5.").max(5, "Difficulty must be between 1 and 5."),
  points: z.number().positive("Points must be greater than zero."),
  numeric_answer: z.string().nullable().optional(),
  numeric_tolerance: z.string().nullable().optional(),
  sequence_order: z.number().int().optional(),
});

export type QuestionWriteValues = z.infer<typeof questionWriteSchema>;

export const attemptAnswerSummarySchema = z.object({
  question: z.number().int().positive(),
  prompt: z.string(),
  question_type: questionTypeSchema,
  selected_choice: z.number().int().positive().nullable(),
  numeric_response: z.string().nullable(),
  is_correct: z.boolean(),
  points_awarded: decimalString("Invalid points awarded."),
  correct_choice: z.number().int().positive().nullable(),
  numeric_answer: z.string().nullable(),
});

export const attemptAnalyticsSchema = z.object({
  id: z.number().int().positive(),
  student: userSummarySchema,
  attempt_number: z.number().int().positive(),
  status: attemptStatusSchema,
  score: z.string().nullable(),
  earned_points: z.string().nullable(),
  maximum_points: z.string().nullable(),
  passed: z.boolean().nullable(),
  started_at: z.string().datetime(),
  expires_at: z.string().datetime().nullable(),
  submitted_at: z.string().datetime().nullable(),
  answers: z.array(attemptAnswerSummarySchema),
});

export const attemptAnalyticsListSchema = paginatedSchema(attemptAnalyticsSchema);
export type AttemptAnalytics = z.infer<typeof attemptAnalyticsSchema>;
export type AttemptAnalyticsList = z.infer<typeof attemptAnalyticsListSchema>;

export const studentSummarySchema = z.object({
  student: userSummarySchema,
  attempts: z.number().int().nonnegative(),
  best_score: z.string().nullable(),
  passed_attempts: z.number().int().nonnegative(),
  last_submitted_at: z.string().datetime().nullable(),
});

export const quizResultsSummarySchema = z.object({
  quiz: z.number().int().positive(),
  quiz_title: z.string(),
  total_attempts: z.number().int().nonnegative(),
  submitted_attempts: z.number().int().nonnegative(),
  average_score: z.string().nullable(),
  pass_rate: z.string().nullable(),
  students: z.array(studentSummarySchema),
});

export type QuizResultsSummary = z.infer<typeof quizResultsSummarySchema>;

export const classroomQuizResultSchema = z.object({
  quiz: z.number().int().positive(),
  title: z.string(),
  status: quizStatusSchema,
  total_attempts: z.number().int().nonnegative(),
  submitted_attempts: z.number().int().nonnegative(),
  passed_attempts: z.number().int().nonnegative(),
  average_score: z.string().nullable(),
});

export type ClassroomQuizResult = z.infer<typeof classroomQuizResultSchema>;

export const classroomQuizResultListSchema = paginatedSchema(classroomQuizResultSchema);
export type ClassroomQuizResultList = z.infer<typeof classroomQuizResultListSchema>;